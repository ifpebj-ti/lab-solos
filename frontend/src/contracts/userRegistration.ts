import { z } from 'zod/v3';
import type { Resolver } from 'react-hook-form';

export const registrationMessages = {
  city: 'Informe uma cidade válida.',
  course: 'O curso deve ter entre 2 e 100 caracteres.',
} as const;

export const userRegistrationSchema = z
  .object({
    nome: z
      .string()
      .toLowerCase()
      .transform((nome) =>
        nome
          .trim()
          .split(' ')
          .map((word) => word[0]?.toLocaleUpperCase() + word.substring(1))
          .join(' ')
      ),
    email: z.string().email('Digite um email válido').toLowerCase(),
    senha: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
    repeat: z.string(),
    tipoUsuario: z.string().min(1, 'Selecione o tipo de usuário'),
    telefone: z
      .string()
      .regex(
        /^\d{10,11}$/,
        'Digite um número de telefone válido com 10 ou 11 dígitos'
      ),
    instituicao: z.string().min(3, 'Digite uma instituição de ensino válida'),
    cidade: z
      .string()
      .trim()
      .min(1, registrationMessages.city)
      .refine(
        (cidade) => cidade.toLocaleLowerCase() !== 'indefinido',
        registrationMessages.city
      ),
    curso: z
      .string()
      .trim()
      .min(2, registrationMessages.course)
      .max(100, registrationMessages.course),
    emailMentor: z.string().email('Digite um email válido'),
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

export type UserRegistrationFormData = z.infer<typeof userRegistrationSchema>;

const fieldError = (messages?: string[]) =>
  messages?.[0]
    ? { type: 'validation', message: messages[0] }
    : undefined;

export const userRegistrationResolver: Resolver<
  UserRegistrationFormData
> = async (values) => {
  const result = await userRegistrationSchema.safeParseAsync(values);

  if (result.success) {
    return { values: result.data, errors: {} };
  }

  const errors = result.error.flatten().fieldErrors;

  return {
    values: {},
    errors: {
      nome: fieldError(errors.nome),
      email: fieldError(errors.email),
      senha: fieldError(errors.senha),
      repeat: fieldError(errors.repeat),
      tipoUsuario: fieldError(errors.tipoUsuario),
      telefone: fieldError(errors.telefone),
      instituicao: fieldError(errors.instituicao),
      cidade: fieldError(errors.cidade),
      curso: fieldError(errors.curso),
      emailMentor: fieldError(errors.emailMentor),
    },
  };
};

export interface CreateAcademicUserData {
  nomeCompleto: string;
  email: string;
  senha: string;
  telefone: string;
  nivelUsuario: 'Mentor' | 'Mentorado';
  tipoUsuario: 'Academico';
  instituicao: string;
  cidade: string;
  curso: string;
  responsavelEmail: string;
}
