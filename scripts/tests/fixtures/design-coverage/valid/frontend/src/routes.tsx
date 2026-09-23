import { Route, Routes } from 'react-router-dom';

export function FixtureRoutes() {
  return (
    <Routes>
      <Route path='/demo' element={<div>fixture</div>} />
    </Routes>
  );
}
