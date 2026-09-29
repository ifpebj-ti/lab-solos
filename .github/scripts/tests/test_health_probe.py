from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading
import unittest


ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "backend/TestSupport/HealthProbe"


class HealthProbeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not shutil.which("dotnet"):
            raise unittest.SkipTest(".NET SDK is required for the real HTTP probe")
        cls.workspace = tempfile.TemporaryDirectory()
        project = Path(cls.workspace.name) / "project"
        project.mkdir()
        for name in ("Program.cs", "HealthProbe.csproj", "packages.lock.json"):
            shutil.copyfile(SOURCE / name, project / name)
        output = Path(cls.workspace.name) / "output"
        build = subprocess.run(
            ["dotnet", "publish", str(project / "HealthProbe.csproj"), "-c", "Release",
             "-o", str(output), "-p:RestoreLockedMode=true", "--disable-build-servers"],
            cwd=ROOT, capture_output=True, text=True, timeout=60,
        )
        if build.returncode:
            cls.workspace.cleanup()
            raise RuntimeError(build.stdout + build.stderr)
        cls.command = ["dotnet", str(output / "HealthProbe.dll")]

    @classmethod
    def tearDownClass(cls):
        cls.workspace.cleanup()

    def probe_http_status(self, status):
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(status)
                self.end_headers()

            def log_message(self, *_args):
                pass

        with ThreadingHTTPServer(("127.0.0.1", 0), Handler) as server:
            worker = threading.Thread(target=server.serve_forever, daemon=True)
            worker.start()
            try:
                return subprocess.run(
                    self.command + [f"http://127.0.0.1:{server.server_port}/health"],
                    capture_output=True, timeout=10,
                ).returncode
            finally:
                server.shutdown()
                worker.join()

    def test_successful_http_response_is_healthy(self):
        self.assertEqual(0, self.probe_http_status(200))

    def test_http_service_failure_is_unhealthy_even_when_port_is_open(self):
        self.assertEqual(1, self.probe_http_status(503))

    def test_connection_failure_is_unhealthy(self):
        with ThreadingHTTPServer(("127.0.0.1", 0), BaseHTTPRequestHandler) as server:
            endpoint = f"http://127.0.0.1:{server.server_port}/health"
        result = subprocess.run(self.command + [endpoint], capture_output=True, timeout=10)
        self.assertEqual(1, result.returncode)

    def test_invalid_configuration_is_rejected(self):
        result = subprocess.run(self.command + ["file:///etc/passwd"], capture_output=True, timeout=10)
        self.assertEqual(2, result.returncode)


if __name__ == "__main__":
    unittest.main()
