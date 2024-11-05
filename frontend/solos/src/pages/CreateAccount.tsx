import InputPassword from '../components/global/inputs/Password';
import InputText from '../components/global/inputs/Text';
import { zodResolver } from '@hookform/resolvers/zod';
import logo from "../../public/images/logo.png";
import { useNavigate } from 'react-router-dom';
import { useForm } from "react-hook-form";
import { z } from 'zod';

const submitCreateAccountSchema = z
    .object({
        nome: z
            .string()
            .toLowerCase()
            .transform((nome) => {
                return nome
                    .trim()
                    .split(" ")
                    .map((word) => word[0].toLocaleUpperCase().concat(word.substring(1)))
                    .join(" ");
            }),
        email: z.string().email("Digite um email válido").toLowerCase(),
        senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
        repeat: z.string(),
    })
    .superRefine((data, ctx) => {
        const nomeParts = data.nome.trim().split(" ").filter((part) => part.length > 3);
        if (nomeParts.length < 2) {
            ctx.addIssue({
                code: "custom",
                path: ["nome"],
                message: "Forneça pelo menos dois nomes com mais de 3 caracteres",
            });
        }
        if (data.senha !== data.repeat) {
            ctx.addIssue({
                code: "custom",
                path: ["repeat"],
                message: "As senhas não coincidem",
            });
        }
    });


type CreateAccountFormData = z.infer<typeof submitCreateAccountSchema> 

function CreateAccount() {
    const {register, handleSubmit, formState: { errors } } = useForm<CreateAccountFormData>({
        resolver: zodResolver(submitCreateAccountSchema),
    });
    const navigate = useNavigate();

    function postCreateAccount() {
        navigate("/login");
    }

    return (
        <div className="h-screen w-full flex justify-center items-center flex-col bg-gradient-to-tr from-[#f4f4f5] to-[#f4f4f5]">
            <div className="w-[700px] bg-backgroundMy border-[1px] border-borderMy rounded-md shadow-lg">
                <div className="w-full bg-primaryMy h-28 flex items-center justify-start gap-x-2 px-4 rounded-t-[5px]">
                    <img alt="Logo" src={logo} className="w-24" />
                    <div className="text-white gap-y-1">
                        <h1 className="font-rajdhani-semibold text-3xl">Lab-On</h1>
                        <p className="font-rajdhani-medium text-base">Gerenciamento de Laboratórios Químicos Online</p>
                    </div>
                </div>
                <div className="w-full bg-backgroundMy rounded-b-md p-4 flex items-center flex-col justify-between">
                    <p className='font-inter-regular text-clt-2 w-full'>Selecione seu tipo de usuário e crie sua conta.</p>
                    <form onSubmit={handleSubmit(postCreateAccount)} className="w-full gap-y-3 flex flex-col mt-2">
                        <div className='gap-y-3 gap-x-5 grid grid-cols-2 w-full'>
                            <InputText 
                                label="Nome Completo"
                                type="text"
                                register={register}
                                error={errors.nome?.message}
                                name="nome"
                            />
                            <InputText 
                                label="Email"
                                type="email"
                                register={register}
                                error={errors.email?.message}
                                name="email"
                            />
                            <InputPassword
                                label="Senha"
                                register={register}
                                error={errors.senha?.message}
                                name="senha"
                            />
                             <InputPassword
                                label="Nova Senha"
                                register={register}
                                error={errors.repeat?.message}
                                name="repeat"
                            />
                        </div>
                        <button type="submit"
                            className="mt-5 mb-3 bg-primaryMy rounded text-center h-9 w-full font-rajdhani-semibold text-white hover:bg-opacity-90">
                            Criar conta
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default CreateAccount;
