import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Base from "./pages/Base";
import Register from "./pages/Register";
import Profile from "./pages/Profile";

function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Base/>}>
                    <Route index element={<Home/>}></Route>
                    <Route path="/register" element={<Register/>}></Route>
                    <Route path="/profile" element={<Profile/>}></Route>                
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default AppRoutes;