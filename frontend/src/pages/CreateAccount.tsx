import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import InputPassword from '../components/global/inputs/Password';
import InputText from '../components/global/inputs/Text';
import logo from '../../public/images/logo.png';
import { useNavigate } from 'react-router-dom';
import { useForm, type UseFormSetError } from 'react-hook-form';
import { createMentor } from '@/integration/Auth';
import {
  userRegistrationResolver,
  type CreateAcademicUserData,
  type UserRegistrationFormData,
} from '@/contracts/userRegistration';
import { toast } from '@/components/hooks/use-toast';
import { useEffect, useState } from 'react';
import { clearSession } from '@/auth/session';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import type { ApplicationError } from '@/errors/applicationError';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { normalizeError } from '@/errors/normalizeError';
import {
  presentError,
  type ErrorPresentation,
} from '@/errors/presentError';
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

const CREATE_ACCOUNT_FIELDS = new Set<string>([
  'nome',
  'email',
  'senha',
  'repeat',
  'tipoUsuario',
  'telefone',
  'instituicao',
  'cidade',
  'curso',
  'emailMentor',
]);

const applyCreateAccountFieldErrors = (
  fieldErrors: ApplicationError['fieldErrors'],
  setError: UseFormSetError<UserRegistrationFormData>
) => {
  for (const [field, messages] of Object.entries(fieldErrors ?? {})) {
    if (!CREATE_ACCOUNT_FIELDS.has(field)) continue;

    const message = messages[0];
    if (message) {
      setError(field as keyof UserRegistrationFormData, {
        type: 'server',
        message,
      });
    }
  }
};

function CreateAccount() {
  const [loading, setLoading] = useState(false);
  const [errorPresentation, setErrorPresentation] =
    useState<ErrorPresentation>();
  const [retryData, setRetryData] = useState<UserRegistrationFormData>();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    setError,
    clearErrors,
  } = useForm<UserRegistrationFormData>({
    resolver: userRegistrationResolver,
  });
  const navigate = useNavigate();

  const postCreateAccount = async (data: UserRegistrationFormData) => {
    setLoading(true);
    setErrorPresentation(undefined);
    setRetryData(data);
    clearErrors();

    const payload: CreateAcademicUserData = {
      nomeCompleto: data.nome,
      email: data.email,
      senha: data.senha,
      telefone: data.telefone,
      nivelUsuario: data.tipoUsuario === 'mentorado' ? 'Mentorado' : 'Mentor',
      tipoUsuario: 'Academico',
      instituicao: data.instituicao,
      cidade: data.cidade,
      curso: data.curso,
      responsavelEmail: data.emailMentor,
    };

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
      const normalizedError = normalizeError(error);
      applyCreateAccountFieldErrors(normalizedError.fieldErrors, setError);
      setErrorPresentation(
        presentError(normalizedError, OPERATION_IDS.createMentor)
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    clearSession();
  }, []);

  return (
    <main className='min-h-screen w-full min-w-0 flex justify-center items-center flex-col bg-backgroundMy p-4'>
      <div className='w-full max-w-[750px] min-w-0 bg-backgroundMy border border-borderMy rounded-md shadow-lg'>
        <div className='w-full bg-green-800 flex flex-col md:flex-row items-start md:items-center justify-start gap-2 p-4 rounded-t-[5px]'>
          <img alt='Logo' src={logo} className='w-20 max-w-full shrink-0' />
          <div className='min-w-0 text-white gap-y-1 [overflow-wrap:anywhere]'>
            <h1 className='font-rajdhani-semibold text-3xl'>LabON</h1>
            <p className='font-rajdhani-medium text-base'>
              Gerenciamento de Laboratórios Químicos Online
            </p>
          </div>
        </div>
        <div className='w-full bg-backgroundMy rounded-b-md p-4 flex items-center flex-col justify-between'>
          <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-3 w-full min-w-0'>
            <p className='font-inter-regular text-clt-2 w-full'>
              Selecione seu tipo de usuário e crie sua conta.
            </p>
            <div className='w-full md:w-44 shrink-0 min-w-0'>
              <Select onValueChange={(value) => setValue('tipoUsuario', value)}>
                <SelectTrigger
                  aria-label='Tipo de usuário'
                  aria-invalid={Boolean(errors.tipoUsuario)}
                  aria-describedby={
                    errors.tipoUsuario ? 'tipoUsuario-error' : undefined
                  }
                  className={`w-full min-w-0 min-h-11 border rounded-sm text-clt-2 font-inter-regular focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800 ${errors.tipoUsuario ? 'border-danger hover:border-red-700' : 'border-stone-500 hover:border-stone-600'}`}
                >
                  <SelectValue placeholder='Tipo' />
                </SelectTrigger>
                <SelectContent className='border border-borderMy rounded-md font-inter-regular bg-backgroundMy'>
                  <SelectItem
                    className='min-h-11 hover:bg-cl-table-item font-inter-regular'
                    value='mentor'
                  >
                    Mentor
                  </SelectItem>
                  <SelectItem
                    className='min-h-11 hover:bg-cl-table-item font-inter-regular'
                    value='mentorado'
                  >
                    Mentorado
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.tipoUsuario && (
                <p
                  id='tipoUsuario-error'
                  className='text-red-700 text-sm [overflow-wrap:anywhere]'
                >
                  {errors.tipoUsuario.message}
                </p>
              )}
            </div>
          </div>
          {errorPresentation ? (
            <ErrorFeedback
              className='mt-3'
              presentation={errorPresentation}
              onRetry={
                retryData ? () => void postCreateAccount(retryData) : undefined
              }
            />
          ) : null}
          <form
            onSubmit={handleSubmit(postCreateAccount)}
            className='w-full gap-y-3 flex flex-col mt-1'
          >
            <div className='gap-y-2 gap-x-5 grid grid-cols-1 md:grid-cols-2 w-full min-w-0'>
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
                required
              />
              <InputText
                label='Cidade'
                type='text'
                register={register}
                error={errors.cidade?.message}
                name='cidade'
                required
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
            <div className='flex flex-wrap items-center gap-x-1 justify-center mt-4 min-w-0'>
              <label
                htmlFor='terms'
                className='min-h-11 flex items-center gap-2 text-sm font-inter-regular cursor-pointer'
              >
                <Checkbox
                  id='terms'
                  className='border-stone-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800'
                />
                Aceito os
              </label>
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    type='button'
                    className='min-h-11 text-sm font-inter-regular text-blue-700 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800'
                  >
                    termos e condições{' '}
                  </button>
                </SheetTrigger>
                <SheetContent
                  side='left'
                  className='max-w-full p-4 pt-16 [overflow-wrap:anywhere] [&>button]:min-h-11 [&>button]:min-w-11 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:opacity-100 [&>button]:focus-visible:outline [&>button]:focus-visible:outline-2 [&>button]:focus-visible:outline-green-800'
                >
                  <SheetHeader>
                    <SheetTitle>TERMOS E CONDIÇÕES DE USO</SheetTitle>
                    <SheetDescription>
                      Bem-vindo(a) ao LabON - Gerenciamento de Laboratórios
                      Químicos Online! Antes de utilizar nossos serviços, leia
                      atentamente os Termos e Condições abaixo. Ao acessar ou
                      utilizar a nossa aplicação, você concorda com todas as
                      regras e diretrizes estabelecidas neste documento.
                    </SheetDescription>
                  </SheetHeader>
                  <div className='grid gap-4 py-4'>1. Aceitação dos Termos</div>
                  <p className='text-sm text-clt-1 font-inter-regular'>
                    Ao se cadastrar e utilizar o LabON, você declara que leu,
                    entendeu e concorda com estes Termos e Condições. Se não
                    concordar com qualquer parte deste documento, não utilize
                    nossos serviços.
                  </p>

                  <div className='grid gap-4 py-4'>
                    2. Cadastro e Responsabilidades do Usuário
                  </div>
                  <p className='text-sm text-clt-1 font-inter-regular font-semibold'>
                    Pré-Cadastro:
                  </p>
                  <ul className='list-disc list-inside text-sm text-clt-1 font-inter-regular'>
                    <li>
                      Para utilizar o LabON, é necessário solicitar acesso
                      através do pré-cadastro, fornecendo informações
                      verdadeiras e atualizadas, como nome, email institucional
                      e instituição de ensino.
                    </li>
                    <li>
                      O acesso será validado manualmente pela equipe do LabON
                      para garantir que o solicitante seja vinculado a uma
                      instituição de ensino pública.
                    </li>
                  </ul>
                  <p className='text-sm text-clt-1 font-inter-regular font-semibold'>
                    Segurança da Conta:
                  </p>
                  <ul className='list-disc list-inside text-sm text-clt-1 font-inter-regular'>
                    <li>
                      Você é responsável por manter a segurança de suas
                      credenciais (login e senha) e por todas as atividades
                      realizadas em sua conta.
                    </li>
                    <li>
                      Em caso de uso não autorizado ou suspeita de violação de
                      segurança, notifique imediatamente a equipe do LabON pelo
                      e-mail jrem1@discente.ifpe.edu.br.
                    </li>
                  </ul>

                  <div className='grid gap-4 py-4'>3. Uso Permitido</div>
                  <p className='text-sm text-clt-1 font-inter-regular font-semibold'>
                    Finalidade Educacional:
                  </p>
                  <ul className='list-disc list-inside text-sm text-clt-1 font-inter-regular'>
                    <li>
                      O LabON é destinado exclusivamente ao gerenciamento de
                      laboratórios de instituições de ensino públicas.
                    </li>
                    <li>
                      O uso comercial ou para fins não educacionais é
                      expressamente proibido.
                    </li>
                  </ul>
                  <p className='text-sm text-clt-1 font-inter-regular font-semibold'>
                    Conduta do Usuário:
                  </p>
                  <ul className='list-disc list-inside text-sm text-clt-1 font-inter-regular'>
                    <li>
                      O usuário se compromete a utilizar a aplicação de maneira
                      ética e legal, sem violar direitos de terceiros ou
                      comprometer a segurança e integridade do sistema.
                    </li>
                    <li>
                      É proibido qualquer uso que possa prejudicar o
                      funcionamento da aplicação, como tentativas de acesso não
                      autorizado, distribuição de malware ou manipulação de
                      dados.
                    </li>
                  </ul>

                  <div className='grid gap-4 py-4'>
                    4. Privacidade e Proteção de Dados
                  </div>
                  <p className='text-sm text-clt-1 font-inter-regular font-semibold'>
                    Coleta de Dados:
                  </p>
                  <p className='text-sm text-clt-1 font-inter-regular'>
                    Coletamos e tratamos dados conforme nossa [Política de
                    Privacidade], que descreve como suas informações pessoais e
                    institucionais são utilizadas.
                  </p>
                  <p className='text-sm text-clt-1 font-inter-regular font-semibold'>
                    Direitos do Usuário:
                  </p>
                  <p className='text-sm text-clt-1 font-inter-regular'>
                    Você tem o direito de acessar, corrigir ou excluir suas
                    informações pessoais, conforme a legislação aplicável da
                    LGPD.
                  </p>

                  <div className='grid gap-4 py-4'>
                    5. Propriedade Intelectual
                  </div>
                  <p className='text-sm text-clt-1 font-inter-regular font-semibold'>
                    Direitos Autorais:
                  </p>
                  <p className='text-sm text-clt-1 font-inter-regular'>
                    Todo o conteúdo da aplicação (textos, imagens, código-fonte,
                    etc.) é protegido por direitos autorais e não pode ser
                    copiado, distribuído ou modificado sem autorização prévia.
                  </p>
                  <p className='text-sm text-clt-1 font-inter-regular font-semibold'>
                    Licença Open-Source:
                  </p>
                  <p className='text-sm text-clt-1 font-inter-regular'>
                    O LabON é um projeto open-source, e o código-fonte está
                    disponível sob a licença Apache-2.0 license. Consulte o
                    repositório oficial para mais detalhes.
                  </p>

                  <div className='grid gap-4 py-4'>
                    6. Modificações nos Termos
                  </div>
                  <p className='text-sm text-clt-1 font-inter-regular'>
                    Reservamo-nos o direito de modificar estes Termos a qualquer
                    momento. As alterações serão comunicadas por e-mail ou
                    através de notificações na aplicação.
                  </p>
                  <p className='text-sm text-clt-1 font-inter-regular'>
                    O uso contínuo do LabON após alterações indica sua aceitação
                    das novas condições.
                  </p>

                  <div className='grid gap-4 py-4'>
                    7. Encerramento de Conta
                  </div>
                  <p className='text-sm text-clt-1 font-inter-regular'>
                    Podemos suspender ou encerrar sua conta caso identifiquemos
                    qualquer violação destes Termos ou uso inadequado da
                    aplicação.
                  </p>
                  <p className='text-sm text-clt-1 font-inter-regular'>
                    Em caso de encerramento, você poderá entrar em contato
                    conosco para solicitar revisão da decisão.
                  </p>

                  <div className='grid gap-4 py-4'>
                    8. Limitação de Responsabilidade
                  </div>
                  <p className='text-sm text-clt-1 font-inter-regular'>
                    O LabON é fornecido "no estado em que se encontra", sem
                    garantias de desempenho ou disponibilidade contínua.
                  </p>
                  <p className='text-sm text-clt-1 font-inter-regular'>
                    Não nos responsabilizamos por danos diretos ou indiretos
                    resultantes do uso ou incapacidade de uso da aplicação.
                  </p>

                  <div className='grid gap-4 py-4'>9. Disposições Gerais</div>
                  <p className='text-sm text-clt-1 font-inter-regular'>
                    Estes Termos são regidos pelas leis brasileiras, e quaisquer
                    disputas serão resolvidas nos tribunais competentes.
                  </p>
                  <p className='text-sm text-clt-1 font-inter-regular'>
                    Caso tenha dúvidas ou precise de suporte, entre em contato
                    pelo e-mail jrem1@discente.ifpe.edu.br.
                  </p>

                  <div className='grid gap-4 py-4'>10. Licença Open-Source</div>
                  <p className='text-sm text-clt-1 font-inter-regular'>
                    O código-fonte do LabON está disponível publicamente sob a
                    licença Apache-2.0 license. Consulte o repositório oficial
                    para mais informações sobre uso, modificação e distribuição.
                  </p>
                  <SheetFooter>
                    <SheetClose asChild>
                      <button
                        type='button'
                        className='bg-green-800 font-rajdhani-semibold text-white shadow-md min-h-11 px-6 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800'
                      >
                        Fechar
                      </button>
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
            <button
              type='submit'
              disabled={loading}
              className='font-rajdhani-semibold text-white text-base bg-green-800 min-h-11 mt-2 w-full min-w-0 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800'
            >
              {loading ? 'Enviando...' : 'Criar Conta'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default CreateAccount;
