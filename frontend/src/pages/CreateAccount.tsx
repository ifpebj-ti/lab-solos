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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

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
  });

type CreateAccountFormData = z.infer<typeof submitCreateAccountSchema>;

function CreateAccount() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<CreateAccountFormData>({
    resolver: zodResolver(submitCreateAccountSchema),
  });
  const navigate = useNavigate();

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
      responsavelEmail: data.emailMentor,
    };

    console.log(payload);

    try {
      const response = await createMentor(payload);
      if (response.status === 201) {
        toast({
          title: 'Cadastro submetido à aprovação!',
          description: 'Redirecionando para a página de login...',
        });
      }
      navigate('/');
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
        <div className='w-full bg-primaryMy h-24 flex items-center justify-start gap-x-2 px-4 rounded-t-[5px]'>
          <img alt='Logo' src={logo} className='w-20' />
          <div className='text-white gap-y-1 mt-2'>
            <h1 className='font-rajdhani-semibold text-3xl'>LabON</h1>
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
            className='w-full gap-y-3 flex flex-col mt-1'
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
              <InputText
                label='Email do Mentor Responsável'
                type='email'
                register={register}
                error={errors.emailMentor?.message}
                name='emailMentor'
              />
            </div>
            <div className='flex items-center space-x-2 justify-center mt-4'>
              <Checkbox id='terms' />
              <p className='text-xs font-inter-regular leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                Aceito os
                <Sheet>
                  <SheetTrigger asChild>
                    <button className='text-blue-700 ml-1'>
                      termos e condições{' '}
                    </button>
                  </SheetTrigger>
                  <SheetContent side='left'>
                    <SheetHeader>
                      <SheetTitle>TERMOS E CONDIÇÕES DE USO</SheetTitle>
                      <SheetDescription>
                        Bem-vindo(a) ao LabON - Gerenciamento de Laboratórios
                        Online! Antes de utilizar nossos serviços, leia
                        atentamente os Termos e Condições abaixo. Ao acessar ou
                        utilizar a nossa aplicação, você concorda com todas as
                        regras e diretrizes estabelecidas neste documento.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="grid gap-4 py-4">
        1. Aceitação dos Termos
      </div>
      <p className="text-sm text-clt-1 font-inter-regular">
        Ao se cadastrar e utilizar o LabON, você declara que leu, entendeu e concorda com estes Termos e Condições. Se não
        concordar com qualquer parte deste documento, não utilize nossos serviços.
      </p>

      <div className="grid gap-4 py-4">2. Cadastro e Responsabilidades do Usuário</div>
      <p className="text-sm text-clt-1 font-inter-regular font-semibold">Pré-Cadastro:</p>
      <ul className="list-disc list-inside text-sm text-clt-1 font-inter-regular">
        <li>
          Para utilizar o LabON, é necessário solicitar acesso através do pré-cadastro, fornecendo informações verdadeiras
          e atualizadas, como nome, email institucional, instituição de ensino e descrição do laboratório.
        </li>
        <li>O acesso será validado manualmente pela equipe do LabON para garantir que o solicitante seja vinculado a uma instituição de ensino pública.</li>
      </ul>
      <p className="text-sm text-clt-1 font-inter-regular font-semibold">Segurança da Conta:</p>
      <ul className="list-disc list-inside text-sm text-clt-1 font-inter-regular">
        <li>Você é responsável por manter a segurança de suas credenciais (login e senha) e por todas as atividades realizadas em sua conta.</li>
        <li>Em caso de uso não autorizado ou suspeita de violação de segurança, notifique imediatamente a equipe do LabON pelo e-mail [EMAIL DE SUPORTE].</li>
      </ul>

      <div className="grid gap-4 py-4">3. Uso Permitido</div>
      <p className="text-sm text-clt-1 font-inter-regular font-semibold">Finalidade Educacional:</p>
      <ul className="list-disc list-inside text-sm text-clt-1 font-inter-regular">
        <li>O LabON é destinado exclusivamente ao gerenciamento de laboratórios de instituições de ensino públicas.</li>
        <li>O uso comercial ou para fins não educacionais é expressamente proibido.</li>
      </ul>
      <p className="text-sm text-clt-1 font-inter-regular font-semibold">Conduta do Usuário:</p>
      <ul className="list-disc list-inside text-sm text-clt-1 font-inter-regular">
        <li>O usuário se compromete a utilizar a aplicação de maneira ética e legal, sem violar direitos de terceiros ou comprometer a segurança e integridade do sistema.</li>
        <li>É proibido qualquer uso que possa prejudicar o funcionamento da aplicação, como tentativas de acesso não autorizado, distribuição de malware ou manipulação de dados.</li>
      </ul>

      <div className="grid gap-4 py-4">4. Privacidade e Proteção de Dados</div>
      <p className="text-sm text-clt-1 font-inter-regular font-semibold">Coleta de Dados:</p>
      <p className="text-sm text-clt-1 font-inter-regular">Coletamos e tratamos dados conforme nossa [Política de Privacidade], que descreve como suas informações pessoais e institucionais são utilizadas.</p>
      <p className="text-sm text-clt-1 font-inter-regular font-semibold">Direitos do Usuário:</p>
      <p className="text-sm text-clt-1 font-inter-regular">Você tem o direito de acessar, corrigir ou excluir suas informações pessoais, conforme a legislação aplicável (ex: Lei Geral de Proteção de Dados - LGPD).</p>

      <div className="grid gap-4 py-4">5. Propriedade Intelectual</div>
      <p className="text-sm text-clt-1 font-inter-regular font-semibold">Direitos Autorais:</p>
      <p className="text-sm text-clt-1 font-inter-regular">Todo o conteúdo da aplicação (textos, imagens, código-fonte, etc.) é protegido por direitos autorais e não pode ser copiado, distribuído ou modificado sem autorização prévia.</p>
      <p className="text-sm text-clt-1 font-inter-regular font-semibold">Licença Open-Source:</p>
      <p className="text-sm text-clt-1 font-inter-regular">O LabON é um projeto open-source, e o código-fonte está disponível sob a licença [NOME DA LICENÇA]. Consulte o repositório oficial para mais detalhes.</p>

      <div className="grid gap-4 py-4">6. Modificações nos Termos</div>
      <p className="text-sm text-clt-1 font-inter-regular">Reservamo-nos o direito de modificar estes Termos a qualquer momento. As alterações serão comunicadas por e-mail ou através de notificações na aplicação.</p>
      <p className="text-sm text-clt-1 font-inter-regular">O uso contínuo do LabON após alterações indica sua aceitação das novas condições.</p>

      <div className="grid gap-4 py-4">7. Encerramento de Conta</div>
      <p className="text-sm text-clt-1 font-inter-regular">Podemos suspender ou encerrar sua conta caso identifiquemos qualquer violação destes Termos ou uso inadequado da aplicação.</p>
      <p className="text-sm text-clt-1 font-inter-regular">Em caso de encerramento, você poderá entrar em contato conosco para solicitar revisão da decisão.</p>

      <div className="grid gap-4 py-4">8. Limitação de Responsabilidade</div>
      <p className="text-sm text-clt-1 font-inter-regular">O LabON é fornecido "no estado em que se encontra", sem garantias de desempenho ou disponibilidade contínua.</p>
      <p className="text-sm text-clt-1 font-inter-regular">Não nos responsabilizamos por danos diretos ou indiretos resultantes do uso ou incapacidade de uso da aplicação.</p>

      <div className="grid gap-4 py-4">9. Disposições Gerais</div>
      <p className="text-sm text-clt-1 font-inter-regular">Estes Termos são regidos pelas leis de [PAÍS/ESTADO], e quaisquer disputas serão resolvidas nos tribunais competentes.</p>
      <p className="text-sm text-clt-1 font-inter-regular">Caso tenha dúvidas ou precise de suporte, entre em contato pelo e-mail [EMAIL DE SUPORTE].</p>

      <div className="grid gap-4 py-4">10. Licença Open-Source</div>
      <p className="text-sm text-clt-1 font-inter-regular">O código-fonte do LabON está disponível publicamente sob a licença [NOME DA LICENÇA]. Consulte o repositório oficial para mais informações sobre uso, modificação e distribuição.</p>
                    <SheetFooter>
                      <SheetClose asChild>
                        <button className='bg-primaryMy font-rajdhani-semibold text-white shadow-md h-9 px-6 rounded-md'>Fechar</button>
                      </SheetClose>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              </p>
            </div>
            <button
              type='submit'
              className='font-rajdhani-semibold text-white text-base bg-primaryMy h-9 mt-2 w-full rounded-sm'
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
