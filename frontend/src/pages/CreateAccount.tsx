import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import InputPassword from '../components/global/inputs/Password';
import InputText from '../components/global/inputs/Text';
import { zodResolver } from '@hookform/resolvers/zod';
import logo from '../../public/images/logo.png';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { createMentor } from '@/integration/Auth';
import { toast } from '@/components/hooks/use-toast';
import { AxiosError } from 'axios';
import { useEffect } from 'react';
import Cookie from 'js-cookie';

const submitCreateAccountSchema = z
  .object({
    nome: z
      .string()
      .toLowerCase()
      .transform((nome) =>
        nome
          .trim()
          .split(' ')
          .map((word) => word[0].toLocaleUpperCase() + word.substring(1))
          .join(' ')
      ),
    email: z.string().email('Digite um email válido').toLowerCase(),
    senha: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
    repeat: z.string(),
    tipoUsuario: z.string().nonempty('Selecione o tipo de usuário'),
    telefone: z
      .string()
      .regex(
        /^\d{10,11}$/,
        'Digite um número de telefone válido com 10 ou 11 dígitos'
      ),
    instituicao: z.string().min(3, 'Digite uma instituição de ensino válida'),
    curso: z.string().min(6, 'Digite um curso válido'),
    emailMentor: z.string().email('Digite um email válido').optional(),
  })
  .superRefine((data, ctx) => {
    const nomeParts = data.nome
      .trim()
      .split(' ')
      .filter((part) => part.length > 3);

    if (nomeParts.length < 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['nome'],
        message: 'Forneça pelo menos dois nomes com mais de 3 caracteres',
      });
    }

    if (data.senha !== data.repeat) {
      ctx.addIssue({
        code: 'custom',
        path: ['repeat'],
        message: 'As senhas não coincidem',
      });
    }

    // Se for mentorado, emailMentor é obrigatório
    if (data.tipoUsuario === 'mentorado' && !data.emailMentor) {
      ctx.addIssue({
        code: 'custom',
        path: ['emailMentor'],
        message: 'O email do mentor responsável é obrigatório',
      });
    }
  });

type CreateAccountFormData = z.infer<typeof submitCreateAccountSchema>;

function CreateAccount() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateAccountFormData>({
    resolver: zodResolver(submitCreateAccountSchema),
  });
  const navigate = useNavigate();

  const tipoUsuario = watch('tipoUsuario');

  const postCreateAccount = async (data: CreateAccountFormData) => {
    const payload = {
      nomeCompleto: data.nome,
      email: data.email,
      senha: data.senha,
      telefone: data.telefone,
      nivelUsuario: data.tipoUsuario === 'mentorado' ? 'Mentorado' : 'Mentor',
      tipoUsuario: 'Academico',
      instituicao: data.instituicao,
      cidade: 'Indefinido',
      curso: data.curso,
      responsavelEmail:
        data.tipoUsuario === 'mentorado'
          ? data.emailMentor || ''
          : 'admin@exemplo.com',
    };

    try {
      const response = await createMentor(payload);
      if (response.status === 201) {
        toast({
          title: 'Cadastro submetido à aprovação!',
          description: 'Redirecionando para a página de login...',
        });
      }
      navigate('/login');
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          toast({
            title: 'Erro durante cadastro',
            description: 'Dados inválidos.',
          });
        } else {
          toast({
            title: 'Erro nos dados fornecidos',
            description: 'Tente novamente com outras credenciais.',
          });
        }
      } else {
        toast({
          title: 'Erro durante cadastro',
          description: 'Dados inválidos.',
        });
      }
    }
  };

  useEffect(() => {
    Cookie.remove('rankID');
    Cookie.remove('doorKey');
    Cookie.remove('level');
  }, []);

  return (
    <div className='h-screen w-full flex justify-center items-center flex-col bg-gradient-to-tr from-[#f4f4f5] to-[#f4f4f5]'>
      <div className='w-[750px] bg-backgroundMy border-[1px] border-borderMy rounded-md shadow-lg'>
        <div className='w-full bg-primaryMy h-28 flex items-center justify-start gap-x-2 px-4 rounded-t-[5px]'>
          <img alt='Logo' src={logo} className='w-24' />
          <div className='text-white gap-y-1'>
            <h1 className='font-rajdhani-semibold text-3xl'>Lab-On</h1>
            <p className='font-rajdhani-medium text-base'>
              Gerenciamento de Laboratórios Químicos Online
            </p>
          </div>
        </div>
        <div className='w-full bg-backgroundMy rounded-b-md p-4 flex items-center flex-col justify-between'>
          <div className='flex items-center justify-between w-full'>
            <p className='font-inter-regular text-clt-2 w-full'>
              Selecione seu tipo de usuário e crie sua conta.
            </p>
            <div>
              <Select onValueChange={(value) => setValue('tipoUsuario', value)}>
                <SelectTrigger
                  className={`w-[180px] border rounded-sm text-clt-2 font-inter-regular ${errors.tipoUsuario ? 'border-danger hover:border-red-700' : 'border-borderMy hover:border-gray-400'}`}
                >
                  <SelectValue placeholder='Tipo' />
                </SelectTrigger>
                <SelectContent className='border border-borderMy rounded-md font-inter-regular bg-backgroundMy'>
                  <SelectItem
                    className='hover:bg-cl-table-item font-inter-regular'
                    value='mentor'
                  >
                    Mentor
                  </SelectItem>
                  <SelectItem
                    className='hover:bg-cl-table-item font-inter-regular'
                    value='mentorado'
                  >
                    Mentorado
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <form
            onSubmit={handleSubmit(postCreateAccount)}
            className='w-full gap-y-3 flex flex-col mt-2'
          >
            <div className='gap-y-3 gap-x-5 grid grid-cols-2 w-full'>
              <InputText
                label='Nome Completo'
                type='text'
                register={register}
                error={errors.nome?.message}
                name='nome'
              />
              <InputText
                label='Email'
                type='email'
                register={register}
                error={errors.email?.message}
                name='email'
              />
              <InputPassword
                label='Senha'
                register={register}
                error={errors.senha?.message}
                name='senha'
              />
              <InputPassword
                label='Confirme sua Senha'
                register={register}
                error={errors.repeat?.message}
                name='repeat'
              />
              <InputText
                label='Instituição'
                type='text'
                register={register}
                error={errors.instituicao?.message}
                name='instituicao'
              />
              <InputText
                label='Curso'
                type='text'
                register={register}
                error={errors.curso?.message}
                name='curso'
              />
              <InputText
                label='Telefone'
                type='text'
                register={register}
                error={errors.telefone?.message}
                name='telefone'
              />
              {/* Campo mentorResponsavel que aparece somente se tipoUsuario for 'mentorado' */}
              {tipoUsuario === 'mentorado' && (
                <InputText
                  label='Email do Mentor Responsável'
                  type='email'
                  register={register}
                  error={errors.emailMentor?.message}
                  name='emailMentor'
                />
              )}
            </div>
            <button
              type='submit'
              className='font-rajdhani-semibold text-white text-base bg-primaryMy h-10 mt-8 w-full rounded-sm'
            >
              Criar Conta
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateAccount;
