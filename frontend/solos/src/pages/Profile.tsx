import LoadingIcon from '../../public/icons/LoadingIcon';
import { useToast } from '../components/hooks/use-toast';
import { Button } from '../components/ui/button';

function Profile() {
  const isLoading = false;
  const { toast } = useToast();

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
        <div className='flex justify-center w-full h-screen items-center flex-col gap-y-5'>
          <h1>Profile</h1>
          <Button
            variant='outline'
            onClick={() => {
              toast({
                title: 'Login bem sucedido!',
                description: 'Redirecionando para a página inicial...',
              });
            }}
          >
            Add to calendar
          </Button>
        </div>
      )}
    </>
  );
}

export default Profile;
