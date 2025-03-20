import { zodResolver } from '@hookform/resolvers/zod';
import logo from '../../../public/images/logo.png';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEffect } from 'react';
import Cookie from 'js-cookie';
import InputText from '@/components/global/inputs/Text';
import { Info } from 'lucide-react';

const submitPreLabSchema = z
  .object({
    nome: z.string().toLowerCase(),
    email: z.string().email('Digite um email válido').toLowerCase(),
    instituicao: z.string().min(3, 'Digite uma instituição de ensino válida'),
    descricao: z
      .string()
      .min(30, 'Digite uma descrição válida com mais de 30 caracteres'),
    motivo: z
      .string()
      .min(30, 'Digite um motivo válido com mais de 30 caracteres'),
    cargo: z.string().min(6, 'Digite um texto válido'),
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
  });

type PreLabFormData = z.infer<typeof submitPreLabSchema>;

function PreLab() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PreLabFormData>({
    resolver: zodResolver(submitPreLabSchema),
  });
  const navigate = useNavigate();

  const postPreLab = async () => {
    navigate('/');
  };

  useEffect(() => {
    Cookie.remove('rankID');
    Cookie.remove('doorKey');
    Cookie.remove('level');
  }, []);

  return (
    <div className='h-screen w-full flex justify-center items-center flex-col bg-gradient-to-tr from-[#f4f4f5] to-[#f4f4f5]'>
      <div className='w-[750px] bg-backgroundMy border-[1px] border-borderMy rounded-md shadow-lg'>
        <div className='w-full bg-primaryMy h-24 flex items-center justify-start gap-x-2 px-4 rounded-t-[5px]'>
          <img alt='Logo' src={logo} className='w-14' />
          <div className='text-white gap-y-1 flex items-center'>
            <h1 className='font-rajdhani-semibold text-3xl mt-2'>
              Solicite Acesso ao LabON
            </h1>
            <Info stroke='#fff' width={50} strokeWidth={2.5} className='mt-1' />
          </div>
        </div>
        <div className='w-full bg-backgroundMy rounded-b-md p-4 flex items-center flex-col justify-between'>
          <form
            onSubmit={handleSubmit(postPreLab)}
            className='w-full gap-y-2 flex flex-col mt-2'
          >
            <div className='gap-y-2 gap-x-5 grid grid-cols-2 w-full'>
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
              <InputText
                label='Instituição de Ensino'
                type='text'
                register={register}
                error={errors.instituicao?.message}
                name='instituicao'
              />
              <InputText
                label='Cargo/Função'
                type='text'
                register={register}
                error={errors.cargo?.message}
                name='cargo'
              />
            </div>
            <div className='gap-y-2 grid grid-cols-1 w-full'>
              <InputText
                label='Descrição do Laboratório'
                type='text'
                register={register}
                error={errors.descricao?.message}
                name='descricao'
              />
              <InputText
                label='Motivo do Interesse'
                type='text'
                register={register}
                error={errors.motivo?.message}
                name='motivo'
              />
            </div>
            <button
              type='submit'
              className='font-rajdhani-semibold text-white text-base bg-primaryMy h-10 mt-8 w-full rounded-sm'
            >
              Submeter Cadastro
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default PreLab;
