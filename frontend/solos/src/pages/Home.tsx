import SearchIcon from "../../public/icons/SearchIcon";
import Laboratory from "../../public/images/laboratory.png";
import AlertIcon from "../../public/icons/AlertIcon";
import JoinIcon from "../../public/icons/JoinIcon";
import LoanIcon from "../../public/icons/LoanIcon";
import Carousel from "../components/global/Carousel";
import InfoCard from "../components/screens/InfoCard";
import analysis from "../../public/images/analysis.png";
import notebook from "../../public/images/notebook.png";
import vidraria from "../../public/images/vidraria.png";
import logo from "../../public/images/logo.png";

function Home() {
    const valor = ['721', '283', '43', '728', '815'];
    const informacoes = ['Solicitações de Empréstimo', 'Itens Monitorados', 'Empréstimos Realizados', 'Empréstimos Monitorados', 'Solicitações de Itens'];
    const imagesSrc = [analysis, notebook, vidraria, notebook, vidraria]
    return (
        <div className="h-full w-full flex justify-start items-center flex-col overflow-y-auto">
            <div className="w-11/12 flex items-center justify-between mt-7">
                <h1 className="uppercase font-rajdhani-medium text-3xl text-clt-2">Home</h1>
                <div className="flex items-center justify-between">
                <button className="border-[1px] border-border rounded-md h-11 w-11 mr-6 flex items-center justify-center hover:bg-cl-table-item transition-all ease-in-out duration-200">
                    <SearchIcon fill="#232323" />
                </button>
                <button className="border-[1px] border-border rounded-md h-11 px-8 uppercase font-inter-semibold text-clt-2 text-sm hover:bg-cl-table-item transition-all ease-in-out duration-200">Login</button>
                </div>
            </div>
            <div className="w-11/12 h-[50%] flex items-center justify-between mt-6">
                <div className="flex justify-center flex-col h-full font-rajdhani-semibold text-6xl text-clt-2 gap-y-3">
                    <p>Laboratório de <span className="text-primary">Solos</span></p>
                    <p>e Sustentabilidade</p>
                    <p>Ambiental - <span className="text-primary">IFPEBJ</span></p>
                </div>
                <img src={Laboratory} alt="Foto ilustrativa de um laboratório" className="h-full w-auto"></img>
            </div>
            <div className="w-11/12 min-h-24 flex justify-between mt-7">
                <InfoCard icon={<AlertIcon/>} text="Produtos com Alerta" notify={false}/>
                <InfoCard icon={<JoinIcon/>} text="Solicitações de Cadastro" notify={true}/>
                <InfoCard icon={<LoanIcon/>} text="Solicitações de Empréstimo" notify={false}/>
            </div>
            <Carousel valor={valor} informacoes={informacoes} imageSrc={imagesSrc}/>
            <div className="w-5/12 h-2 bg-primary rounded-lg text-background">.</div>
            <div className="w-full min-h-44 bg-primary mt-16 flex items-center justify-center">
                <div className="w-11/12 flex items-center justify-between h-full text-white">
                    <div className="flex items-center justify-center ">
                        <img src={logo} alt="Logo" className="w-28"/>
                        <div className="flex-col mt-2">
                            <p className="text-4xl font-rajdhani-semibold">Lab-On</p>
                            <p className="font-rajdhani-medium text-lg">Gerenciamento de Laboratórios Químicos Online</p>
                        </div>
                    </div>
                    <div className="flex items-end justify-end flex-col h-2/5 font-rajdhani-medium">
                        <p>© TODOS OS DIREITOS RESERVADOS</p>
                        <div className="flex space-x-1">
                            <a href="mailto:jessica.roberta@gmail.com" className="hover:underline hover:text-blue-600 cursor-pointer">
                                Jessica Roberta
                            </a>,&nbsp;
                            <a href="mailto:ricardo.espindola@gmail.com" className="hover:underline hover:text-blue-600 cursor-pointer">
                                Ricardo Espíndola
                            </a>&nbsp; e&nbsp;
                            <a href="mailto:ricardoespindola128@gmail.com" className="hover:underline hover:text-blue-600 cursor-pointer">
                                Tomás Abdias
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Home;
