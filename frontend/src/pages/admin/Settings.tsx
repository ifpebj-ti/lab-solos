import ChangePassword from '../ChangePassword';

function Settings() {
  return (
    <div className='flex flex-col items-center justify-center h-full w-full p-8'>
      <h1 className='text-3xl font-bold mb-4'>Configurações</h1>
      <ChangePassword />
    </div>
  );
}

export default Settings;
