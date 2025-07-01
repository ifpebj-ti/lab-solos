import { useNavigate } from 'react-router-dom';

interface UnderDevelopmentProps {
  title?: string;
  description?: string;
  showBackButton?: boolean;
}

function UnderDevelopment({
  title = 'Funcionalidade em Desenvolvimento',
  description = 'Esta página está sendo desenvolvida e estará disponível em breve.',
  showBackButton = true,
}: UnderDevelopmentProps) {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1); // Volta para a página anterior
  };

  return (
    <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center'>
      <div className='bg-white rounded-lg shadow-2xl p-8 mx-4 max-w-md w-full text-center'>
        <div className='text-6xl mb-4'>🚧</div>
        <h2 className='text-2xl font-rajdhani-semibold text-clt-2 mb-4'>
          {title}
        </h2>
        <p className='text-clt-2 font-inter-regular mb-6 leading-relaxed'>
          {description}
        </p>
        <div className='bg-yellow-100 border border-yellow-300 rounded-md p-3 mb-6'>
          <p className='text-yellow-800 font-inter-medium text-sm'>
            ⚠️ Esta funcionalidade está temporariamente indisponível
          </p>
        </div>

        {showBackButton && (
          <div className='flex gap-3 justify-center'>
            <button
              onClick={handleGoBack}
              className='bg-primaryMy text-white px-6 py-2 rounded-md font-inter-medium hover:bg-green-600 transition-colors'
            >
              ← Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default UnderDevelopment;
