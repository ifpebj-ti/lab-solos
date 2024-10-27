import SearchIcon from '../../public/icons/SearchIcon';
import Laboratory from '../../public/images/laboratory.png';
import AlertIcon from '../../public/icons/AlertIcon';
import JoinIcon from '../../public/icons/JoinIcon';
import LoanIcon from '../../public/icons/LoanIcon';

function Home() {
    return (
        <div className="flex items-center justify-center w-full h-screen bg-background">
            <div className="h-screen w-11/12 flex flex-col">
                <div className="w-full flex items-center justify-between mt-7">
                    <h1 className="uppercase font-rajdhani-medium text-3xl text-clt-2">Home</h1>
                    <div className="flex items-center justify-between">
                        <button className="border-[1px] border-border rounded-md h-11 w-11 mr-6 flex items-center justify-center hover:bg-cl-table-item transition-all ease-in-out duration-200">
                            <SearchIcon fill='#232323'/>
                        </button>
                        <button className="border-[1px] border-border rounded-md h-11 px-8 uppercase font-inter-semibold text-clt-2 text-sm hover:bg-cl-table-item transition-all ease-in-out duration-200">Login</button>
                    </div>
                </div>
                <div className='w-full h-[50%] flex items-center justify-between mt-6'>
                    <div className='flex justify-center flex-col h-full font-rajdhani-semibold text-6xl text-clt-2 gap-y-3'>
                        <p>Laboratório de <span className='text-primary'>Solos</span></p>
                        <p>e Sustentabilidade</p> 
                        <p>Ambiental - <span className='text-primary'>IFPEBJ</span></p>
                    </div>
                    <img src={Laboratory} alt='Foto ilustrativa de um laboratório' className='h-full w-auto'></img>
                </div>
                <div className='w-full h-24 flex justify-between mt-7'>
                    <div className='w-1/4 gap-x-4 h-full border-border border-[1px] rounded-md flex items-center px-5 hover:bg-cl-table-item transition-all ease-in-out duration-200'>
                        <AlertIcon/>
                        <p className='font-inter-medium uppercase text-clt-2 text-sm'>Produtos com Alerta</p>
                    </div>
                    <div className='w-1/4 gap-x-4 h-full border-border border-[1px] rounded-md flex items-center px-5 hover:bg-cl-table-item transition-all ease-in-out duration-200'>
                        <JoinIcon/>
                        <p className='font-inter-medium uppercase text-clt-2 text-sm'>Solicitações de Cadastro</p>
                    </div>
                    <div className='w-1/4 gap-x-4 h-full border-border border-[1px] rounded-md flex items-center px-5 hover:bg-cl-table-item transition-all ease-in-out duration-200'>
                        <LoanIcon/>
                        <p className='font-inter-medium uppercase text-clt-2 text-sm'>Solicitações de Empréstimo</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Home;