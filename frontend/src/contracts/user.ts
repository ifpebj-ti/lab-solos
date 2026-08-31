import { z } from 'zod';

import { isCivilDate } from '@/function/date';

export const statusUsuarioSchema = z.enum([
  'Pendente',
  'Habilitado',
  'Bloqueado',
  'Desabilitado',
]);

export const nivelUsuarioSchema = z.enum([
  'Administrador',
  'Mentor',
  'Mentorado',
  'Comum',
]);

export const tipoUsuarioSchema = z.enum([
  'Administrador',
  'Academico',
  'Comum',
]);

export const civilDateSchema = z.string().refine(isCivilDate, {
  message: 'Data civil deve usar o formato YYYY-MM-DD.',
});

export const nullableCivilDateSchema = civilDateSchema.nullable();

export const usuarioComumSchema = z.object({
  id: z.number().int(),
  nomeCompleto: z.string(),
  email: z.string(),
  telefone: z.string().nullable(),
  dataIngresso: nullableCivilDateSchema,
  status: statusUsuarioSchema,
  nivelUsuario: nivelUsuarioSchema,
});

const vinculoAcademicoSchema = z.object({
  cidade: z.string().nullable(),
  curso: z.string().nullable(),
});

const usuarioAcademicoRelacionadoSchema = usuarioComumSchema.extend({
  ...vinculoAcademicoSchema.shape,
  instituicao: z.string().nullable(),
});

export const responsavelSchema = usuarioAcademicoRelacionadoSchema;
export const dependenteSchema = usuarioAcademicoRelacionadoSchema;

export const usuarioSchema = usuarioComumSchema.extend({
  tipoUsuario: tipoUsuarioSchema,
  responsavel: responsavelSchema.nullable(),
});

export const academicoSchema = usuarioSchema.extend({
  ...vinculoAcademicoSchema.shape,
  instituicao: z.string(),
});

export type StatusUsuario = z.infer<typeof statusUsuarioSchema>;
export type NivelUsuario = z.infer<typeof nivelUsuarioSchema>;
export type TipoUsuario = z.infer<typeof tipoUsuarioSchema>;
export type UsuarioComum = z.infer<typeof usuarioComumSchema>;
export type Usuario = z.infer<typeof usuarioSchema>;
export type Academico = z.infer<typeof academicoSchema>;
export type Responsavel = z.infer<typeof responsavelSchema>;
export type Dependente = z.infer<typeof dependenteSchema>;
