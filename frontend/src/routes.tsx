import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Base from './pages/Base';
import Register from './pages/insert/Register';
import Profile from './pages/Profile';
import Login from './pages/Login';
import CreateAccount from './pages/CreateAccount';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Launch from './pages/insert/Launch';
import FollowUp from './pages/FollowUp';
import SearchMaterial from './pages/search/SearchMaterial';
import Verification from './pages/Verification';
import RegisteredUsers from './pages/RegisteredUsers';
import RegistrationRequest from './pages/RegistrationRequests';
import ViewClass from './pages/ViewClass';
import MentoringHistory from './pages/history/MentoringHistory';
// essa rota vai ser só pra admim
// import ClassHistory from './pages/history/ClassHistory';
import PrivateRoute from './components/base/PrivateRoutes';
import Page404 from './pages/Page404';
import LoanCreation from './pages/loan/LoanCreation';
import LoanReview from './pages/loan/LoanReview';
import LoanHistory from './pages/loan/LoanHistory';
import LoanHistories from './pages/loan/LoanHistories';
import MyClass from './pages/MyClass';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Base />}>
          <Route index element={<Home />}></Route>
          <Route path='/profile' element={<Profile />}></Route>
          <Route path='/followUp' element={<FollowUp />}></Route>
          <Route path='/search/material' element={<SearchMaterial />}></Route>
          <Route path='/verification' element={<Verification />}></Route>
          <Route path='/viewClass' element={<ViewClass />}></Route>

          {/* telas de histórico */}
          <Route path='/history/class' element={<LoanHistories />}></Route>
          <Route
            path='/history/mentoring'
            element={<MentoringHistory />}
          ></Route>

          {/* insert de bens */}
          <Route path='/insert/' element={<Register />}></Route>
          <Route path='/insert/launch' element={<Launch />}></Route>

          {/* Users get */}
          <Route
            path='/users'
            element={
              <PrivateRoute
                element={<RegisteredUsers />}
                requiredRank={['1']}
              />
            }
          ></Route>
          <Route
            path='/users/request'
            element={<RegistrationRequest />}
          ></Route>
          {/* loan routes */}
          <Route path='/loan/creation' element={<LoanCreation />}></Route>
          <Route path='/loan/review' element={<LoanReview />}></Route>
          <Route path='/loan/history' element={<LoanHistory />}></Route>
          <Route path='/loan/histories' element={<LoanHistories />}></Route>
          <Route path='/me/myclass' element={<MyClass />}></Route>
        </Route>
        {/* rotas sem autenticação */}
        <Route path='/login' element={<Login />}></Route>
        <Route path='/forgotYourPassword' element={<ForgotPassword />}></Route>
        <Route path='/resetPassword' element={<ResetPassword />}></Route>
        <Route path='/createAccount' element={<CreateAccount />}></Route>
        <Route path='*' element={<Page404 />}></Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
