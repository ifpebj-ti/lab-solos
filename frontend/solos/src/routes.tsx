import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Base from "./pages/Base";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import CreateAccount from "./pages/CreateAccount";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Base/>}>
                    <Route index element={<Home/>}></Route>
                    <Route path="/register" element={<Register/>}></Route>
                    <Route path="/profile" element={<Profile/>}></Route>                
                </Route>
                <Route path="/login" element={<Login />}></Route>
                <Route path="/forgotyourpassword" element={<ForgotPassword />}></Route>
                <Route path="/resetPassword" element={<ResetPassword />}></Route>
                <Route path="/createAccount" element={<CreateAccount />}></Route>
            </Routes>
        </BrowserRouter>
    )
}

export default AppRoutes;