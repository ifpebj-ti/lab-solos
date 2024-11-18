import LoadingIcon from '../../public/icons/LoadingIcon';

function Profile() {
  const isLoading = false;

  return (
    <>
      {isLoading ? (
        <div className='flex justify-center flex-row w-full h-screen items-center gap-x-4 font-inter-medium text-clt-2'>
          <div className='animate-spin'>
            <LoadingIcon />
          </div>
          Carregando...
        </div>
      ) : (
        <div className='flex justify-center flex-row w-full h-screen items-center'>
          Profile
        </div>
      )}
    </>
  );
}

export default Profile;
