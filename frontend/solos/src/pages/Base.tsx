import { Outlet } from "react-router-dom";
import Sidebar from "../components/base/Sidebar";
import Container from "../components/global/Container";

function Base() {
    return (
        <div className="flex justify-start flex-row w-full h-screen">
            <Sidebar/>
            <Container>
                <Outlet/>
            </Container>
        </div>
    )
}

export default Base;