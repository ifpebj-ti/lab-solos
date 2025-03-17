import BaseAdmin from './pages/BaseAdmin';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
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
import MentoringHistory from './pages/mentor/MentoringHistory';
import Page404 from './pages/Page404';
import LoanCreation from './pages/mentor/LoanCreation';
import LoanHistory from './pages/loan/LoanHistory';
import LoanHistories from './pages/loan/LoanHistories';
import HomeAdmin from './pages/admin/Home';
import BaseMentee from './pages/BaseMentee';
import ProfileMentee from './pages/mentee/Profile';
import HistoryMentoring from './pages/mentee/HistoryMentoring';
import LoanHistoryMentee from './pages/mentee/LoanHistory';
import VerificationMentee from './pages/mentee/Verification';
import BaseMentor from './pages/BaseMentor';
import ProfileMentor from './pages/mentor/Profile';
import MyClass from './pages/mentor/MyClass';
import HistoryClass from './pages/mentor/HistoryClass';
import PrivateRoute from './components/base/PrivateRoutes';
import ViewClassMentor from './pages/ViewClassMentor';
import AllLoans from './pages/admin/AllLoans';
import LoansRequest from './pages/admin/LoansRequest';
import VerificationMentor from './pages/mentor/VerificationMentor';
import ClassLoan from './pages/admin/ClassLoan';
import SearchMaterialMentor from './pages/search/SearchMaterialMentor';
import SearchMaterialMentee from './pages/search/SearchMaterialMentee';
import MentoringHistoryAdm from './pages/admin/MentoringHistoryAdm';
import BootScreen from './pages/BootScreen';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas de Admin  */}
        <Route path='/admin' element={<BaseAdmin />}>
          <Route
            index
            element={
              <PrivateRoute
                element={<HomeAdmin />}
                requiredRank={['Administrador']}
              />
            }
          />
          <Route
            path='profile'
            element={
              <PrivateRoute
                element={<Profile />}
                requiredRank={['Administrador']}
              />
            }
          />
          <Route
            path='insert'
            element={
              <PrivateRoute
                element={<Register />}
                requiredRank={['Administrador']}
              />
            }
          />
          <Route
            path='follow-up'
            element={
              <PrivateRoute
                element={<FollowUp />}
                requiredRank={['Administrador']}
              />
            }
          />
          <Route
            path='users'
            element={
              <PrivateRoute
                element={<RegisteredUsers />}
                requiredRank={['Administrador']}
              />
            }
          />
          <Route
            path='search-material'
            element={
              <PrivateRoute
                element={<SearchMaterial />}
                requiredRank={['Administrador']}
              />
            }
          />
          <Route
            path='view-class'
            element={
              <PrivateRoute
                element={<ViewClass />}
                requiredRank={['Administrador']}
              />
            }
          />
          <Route
            path='view-class-mentor'
            element={
              <PrivateRoute
                element={<ViewClassMentor />}
                requiredRank={['Administrador']}
              />
            }
          />
          <Route
            path='view-history-class-by-id'
            element={
              <PrivateRoute
                element={<ClassLoan />}
                requiredRank={['Administrador']}
              />
            }
          />
          <Route
            path='verification'
            element={
              <PrivateRoute
                element={<Verification />}
                requiredRank={['Administrador']}
              />
            }
          />
          <Route
            path='history/mentoring'
            element={
              <PrivateRoute
                element={<MentoringHistoryAdm />}
                requiredRank={['Administrador']}
              />
            }
          />
          <Route
            path='insert/launch'
            element={
              <PrivateRoute
                element={<Launch />}
                requiredRank={['Administrador']}
              />
            }
          />
          <Route
            path='history/loan'
            element={
              <PrivateRoute
                element={<LoanHistory />}
                requiredRank={['Administrador']}
              />
            }
          />
          <Route
            path='register-request'
            element={
              <PrivateRoute
                element={<RegistrationRequest />}
                requiredRank={['Administrador']}
              />
            }
          />
          <Route
            path='all-loans'
            element={
              <PrivateRoute
                element={<AllLoans />}
                requiredRank={['Administrador']}
              />
            }
          />
          <Route
            path='loans-request'
            element={
              <PrivateRoute
                element={<LoansRequest />}
                requiredRank={['Administrador']}
              />
            }
          />
        </Route>

        {/* Rotas de Mentor */}
        <Route path='/mentor' element={<BaseMentor />}>
          <Route
            index
            element={
              <PrivateRoute element={<Home />} requiredRank={['Mentor']} />
            }
          />
          <Route
            path='profile'
            element={
              <PrivateRoute
                element={<ProfileMentor />}
                requiredRank={['Mentor']}
              />
            }
          />
          <Route
            path='my-class'
            element={
              <PrivateRoute element={<MyClass />} requiredRank={['Mentor']} />
            }
          />
          <Route
            path='verification'
            element={
              <PrivateRoute
                element={<VerificationMentor />}
                requiredRank={['Mentor']}
              />
            }
          />
          <Route
            path='history/class'
            element={
              <PrivateRoute
                element={<HistoryClass />}
                requiredRank={['Mentor']}
              />
            }
          />
          <Route
            path='loan/creation'
            element={
              <PrivateRoute
                element={<LoanCreation />}
                requiredRank={['Mentor']}
              />
            }
          />
          <Route
            path='users-request'
            element={
              <PrivateRoute
                element={<RegistrationRequest />}
                requiredRank={['Mentor']}
              />
            }
          />
          <Route
            path='search-material'
            element={
              <PrivateRoute
                element={<SearchMaterialMentor />}
                requiredRank={['Mentor']}
              />
            }
          />
          <Route
            path='history/mentee'
            element={
              <PrivateRoute
                element={<LoanCreation />}
                requiredRank={['Mentor']}
              />
            }
          />
          <Route
            path='history/mentoring'
            element={
              <PrivateRoute
                element={<MentoringHistory />}
                requiredRank={['Mentor']}
              />
            }
          />
          <Route
            path='history/loan'
            element={
              <PrivateRoute
                element={<LoanHistory />}
                requiredRank={['Mentor']}
              />
            }
          />
          <Route
            path='loan/histories'
            element={
              <PrivateRoute
                element={<LoanHistories />}
                requiredRank={['Mentor']}
              />
            }
          />
        </Route>

        {/* Rotas de Mentee */}
        <Route path='/mentee' element={<BaseMentee />}>
          <Route
            index
            element={
              <PrivateRoute element={<Home />} requiredRank={['Mentorado']} />
            }
          />
          <Route
            path='search-material'
            element={
              <PrivateRoute
                element={<SearchMaterialMentee />}
                requiredRank={['Mentorado']}
              />
            }
          />
          <Route
            path='profile'
            element={
              <PrivateRoute
                element={<ProfileMentee />}
                requiredRank={['Mentorado']}
              />
            }
          />
          <Route
            path='history/mentoring'
            element={
              <PrivateRoute
                element={<HistoryMentoring />}
                requiredRank={['Mentorado']}
              />
            }
          />
          <Route
            path='history/loan'
            element={
              <PrivateRoute
                element={<LoanHistoryMentee />}
                requiredRank={['Mentorado']}
              />
            }
          />
          <Route
            path='verification'
            element={
              <PrivateRoute
                element={<VerificationMentee />}
                requiredRank={['Mentorado']}
              />
            }
          />
        </Route>

        {/* Rotas sem autenticação */}
        <Route index path='/boot' element={<BootScreen />} />
        <Route index path='/' element={<Login />} />
        <Route path='/forgot-your-password' element={<ForgotPassword />} />
        <Route path='/reset-password' element={<ResetPassword />} />
        <Route path='/create-account' element={<CreateAccount />} />
        <Route path='*' element={<Page404 />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
