import Falha from '../../public/images/responsiveness.png';

function NoResponsiveness() {
  return (
    <div className='flex flex-col justify-center items-center w-full h-screen bg-backgroundMy text-clt-2 font-inter-medium text-balance px-10 min-h-screen pb-9'>
      <img src={Falha} alt='Imagem de falha'></img>
      <div className='w-full flex items-center justify-center flex-col text-center text-balance p-3 mt-3 uppercase bg-primaryMy text-white font-rajdhani-bold'>
        Este sistema foi desenvolvido para uso em desktop. Para acessá-lo,
        utilize um dispositivo com tela maior.
      </div>
    </div>
  );
}

export default NoResponsiveness;
