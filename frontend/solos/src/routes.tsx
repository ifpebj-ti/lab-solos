import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Base from './pages/Base';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Login from './pages/Login';
import CreateAccount from './pages/CreateAccount';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Launch from './pages/Launch';
import FollowUp from './pages/FollowUp';
import SearchMaterial from './pages/SearchMaterial';
import Verification from './pages/Verification';
import RegisteredUsers from './pages/RegisteredUsers';
import RegistrationRequest from './pages/RegistrationRequests';
import ViewClass from './pages/ViewClass';
import MentoringHistory from './pages/MentoringHistory';
import ClassHistory from './pages/ClassHistory';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Base />}>
          <Route index element={<Home />}></Route>
          <Route path='/register' element={<Register />}></Route>
          <Route path='/profile' element={<Profile />}></Route>
          <Route path='/launch' element={<Launch />}></Route>
          <Route path='/followUp' element={<FollowUp />}></Route>
          <Route path='/searchMaterial' element={<SearchMaterial />}></Route>
          <Route path='/verification' element={<Verification />}></Route>
          <Route path='/registeredUsers' element={<RegisteredUsers />}></Route>
          <Route path='/viewClass' element={<ViewClass />}></Route>
          <Route path='/classHistory' element={<ClassHistory />}></Route>
          <Route
            path='/mentoringHistory'
            element={<MentoringHistory />}
          ></Route>
          <Route
            path='/registrationRequest'
            element={<RegistrationRequest />}
          ></Route>
        </Route>
        <Route path='/login' element={<Login />}></Route>
        <Route path='/forgotYourPassword' element={<ForgotPassword />}></Route>
        <Route path='/resetPassword' element={<ResetPassword />}></Route>
        <Route path='/createAccount' element={<CreateAccount />}></Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
