import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import InputPassword from '../components/global/inputs/Password';
import InputText from '../components/global/inputs/Text';
import { zodResolver } from '@hookform/resolvers/zod';
import logo from "../../public/images/logo.png";
import { useNavigate } from 'react-router-dom';
import { useForm } from "react-hook-form";
import { z } from 'zod';
import UpDownIcon from '../../public/icons/UpDownIcon';
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useState } from "react";
 
const frameworks = [
  {
    value: "next.js",
    label: "Next.js",
  },
  {
    value: "sveltekit",
    label: "SvelteKit",
  },
  {
    value: "nuxt.js",
    label: "Nuxt.js",
  },
  {
    value: "remix",
    label: "Remix",
  },
  {
    value: "astro",
    label: "Astro",
  },
]

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
        tipoUsuario: z.string().nonempty("Selecione o tipo de usuário"), // novo campo obrigatório
        telefone: z.string().regex(/^\d{10,11}$/, "Digite um número de telefone válido com 10 ou 11 dígitos"),
        instituicao: z.string().min(3, 'Digite uma instituição de ensino válida'),
        // cpf: z.string().regex(/^(?:\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})$/, "Digite um CPF válido com 11 dígitos"),
        curso: z.string().min(6, 'Digite um curso válido')

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
    }
);

type CreateAccountFormData = z.infer<typeof submitCreateAccountSchema> 

function CreateAccount() {
    const [open, setOpen] = useState(false)
    const [value2, setValue2] = useState("")
    const {register, handleSubmit, formState: { errors }, setValue } = useForm<CreateAccountFormData>({
        resolver: zodResolver(submitCreateAccountSchema),
    });
    const navigate = useNavigate();

    function postCreateAccount(data: CreateAccountFormData) {
        console.log(data); // Aqui você pode ver todos os dados do formulário
        navigate("/login");
    }

    return (
        <div className="h-screen w-full flex justify-center items-center flex-col bg-gradient-to-tr from-[#f4f4f5] to-[#f4f4f5]">
            <div className="w-[750px] bg-backgroundMy border-[1px] border-borderMy rounded-md shadow-lg">
                <div className="w-full bg-primaryMy h-28 flex items-center justify-start gap-x-2 px-4 rounded-t-[5px]">
                    <img alt="Logo" src={logo} className="w-24" />
                    <div className="text-white gap-y-1">
                        <h1 className="font-rajdhani-semibold text-3xl">Lab-On</h1>
                        <p className="font-rajdhani-medium text-base">Gerenciamento de Laboratórios Químicos Online</p>
                    </div>
                </div>
                <div className="w-full bg-backgroundMy rounded-b-md p-4 flex items-center flex-col justify-between">
                    <div className="flex items-center justify-between w-full">
                        <p className='font-inter-regular text-clt-2 w-full'>Selecione seu tipo de usuário e crie sua conta.</p>
                        <div>
                            <Select
                                onValueChange={(value) => setValue('tipoUsuario', value)}
                            >
                                <SelectTrigger className={`w-[180px] border rounded-sm text-clt-2 font-inter-regular ${errors.tipoUsuario ? 'border-danger hover:border-red-700' : 'border-borderMy hover:border-gray-400'}`}>
                                    <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                                <SelectContent className="border border-borderMy rounded-md font-inter-regular bg-backgroundMy">
                                    <SelectItem className="hover:bg-cl-table-item font-inter-regular" value="mentor">Mentor</SelectItem>
                                    <SelectItem className="hover:bg-cl-table-item font-inter-regular" value="mentorado">Mentorado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                    </div>
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
                                label="Confirme sua Senha"
                                register={register}
                                error={errors.repeat?.message}
                                name="repeat"
                            />
                            <InputText 
                                label="Instituição"
                                type="text"
                                register={register}
                                error={errors.instituicao?.message}
                                name="instituicao"
                            />
                            <InputText 
                                label="Curso"
                                type="text"
                                register={register}
                                error={errors.curso?.message}
                                name="curso"
                            />
                            <InputText 
                                label="Telefone"
                                type="text"
                                register={register}
                                error={errors.telefone?.message}
                                name="telefone"
                            />
                            {/* daqui */}
                            <div className="flex flex-col gap-y-1">
                                <p className="font-inter-regular text-sm text-clt-2 mt-3">Selecione o Mentor Responsável</p>
                                <Popover open={open} onOpenChange={setOpen}>
                                    <PopoverTrigger asChild >
                                        <button
                                        role="combobox"
                                        aria-expanded={open}
                                        className="w-full  justify-between flex h-9 rounded-sm items-center px-3 border border-borderMy font-inter-regular text-sm text-clt-2"
                                        >
                                        {value2
                                            ? frameworks.find((framework) => framework.value === value2)?.label
                                            : "Clique e selecione..."}
                                        <UpDownIcon />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-0">
                                        <Command className="border border-borderMy bg-backgroundMy">
                                        <CommandInput placeholder="Pesquisar" className="h-9 font-inter-regular" />
                                        <CommandList>
                                            <CommandEmpty>Nenhum Mentor encontrado</CommandEmpty>
                                            <CommandGroup>
                                            {frameworks.map((framework) => (
                                                <CommandItem
                                                    className="font-inter-regular text-clt-2 hover:bg-slate-500"
                                                    key={framework.value}
                                                    value={framework.value}
                                                    onSelect={(currentValue) => {
                                                        setValue2(currentValue === value2 ? "" : currentValue)
                                                        setOpen(false)
                                                    }}
                                                >
                                                    {framework.label}
                                                    <Check className={cn("ml-auto", value2 === framework.value ? "opacity-100" : "opacity-0")}/>
                                                </CommandItem>
                                            ))}
                                            </CommandGroup>
                                        </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            {/* até aqui */}
                        </div>
                        <button type="submit"
                            className="mt-5 mb-3 bg-primaryMy rounded text-center h-9 w-full font-rajdhani-semibold text-white hover:bg-opacity-90">
                            Avançar
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default CreateAccount;