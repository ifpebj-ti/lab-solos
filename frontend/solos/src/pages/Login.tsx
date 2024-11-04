import logo from "../../public/images/logo.png";
import InputText from "../components/global/inputs/Text";

function Login() {
    return (
        <div className="h-screen w-full flex justify-center items-center flex-col bg-gradient-to-tr from-[#d9d9d9] to-[#f4f4f5]">
            <div className="w-96 bg-background border-[1px] border-border rounded-md">
                <div className="w-full bg-primary h-28 flex items-center justify-start gap-x-2 px-4 rounded-t-[5px]">
                    <img alt="Logo" src={logo} className="w-24"></img>
                    <div className="text-white gap-y-1">
                        <h1 className="font-rajdhani-semibold text-3xl">Lab-On</h1>
                        <p className="font-rajdhani-medium text-base">Gerenciamento de Laboratórios <br></br> Químicos Online</p>
                    </div>
                </div>
                <div className="w-full bg-background h-72 rounded-b-md p-4 flex items-center justify-center flex-col">
                    {/* <p className="font-rajdhani-semibold text-2xl">Seja bem vindo!</p> */}
                    <div className="w-full gap-y-4 flex flex-col">
                        <div className="w-full">
                            <p className="font-inter-regular text-sm">Email</p>
                            <InputText/>
                        </div>
                        <div className="w-full">
                            <p className="font-inter-regular text-sm">Email</p>
                            <InputText/>
                        </div>
                    </div>
                    <p>opa</p>
                    <button className="bg-primary rounded text-center h-9 w-full">Submeter Login</button>
                </div>
            </div>      
        </div>
    )
}

export default Login;