import ChangePassword from '../ChangePassword';

function Settings() {
  return (
    <main className='min-h-svh bg-canvas px-4 py-8 text-clt-2 sm:px-6 lg:px-8'>
      <div className='mx-auto flex w-full max-w-3xl flex-col items-center gap-6'>
        <h1 className='text-center font-rajdhani-medium text-3xl uppercase text-clt-2'>Configurações</h1>
        <section aria-label='Alterar senha' className='w-full rounded-xl border border-borderMy bg-surface p-4 shadow-sm sm:p-6'>
          <ChangePassword />
        </section>
      </div>
    </main>
  );
}

export default Settings;
