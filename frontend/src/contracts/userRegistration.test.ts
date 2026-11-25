import { describe, expect, it } from 'vitest';

import { userRegistrationSchema } from './userRegistration';

const validRegistration = {
  nome: 'Maria Silva',
  email: 'maria@example.com',
  senha: 'Senha123',
  repeat: 'Senha123',
  tipoUsuario: 'mentor',
  telefone: '81999999999',
  instituicao: 'IFPE',
  cidade: 'Belo Jardim',
  curso: 'ES',
  emailMentor: 'mentor@example.com',
};

describe('userRegistrationSchema', () => {
  it('aceita curso curto e normaliza cidade e curso', () => {
    const registration = userRegistrationSchema.parse({
      ...validRegistration,
      cidade: '  Belo Jardim  ',
      curso: '  ES  ',
    });

    expect(registration.cidade).toBe('Belo Jardim');
    expect(registration.curso).toBe('ES');
  });

  it('permite Mentor sem responsável e exige e-mail válido para Mentorado', () => {
    expect(
      userRegistrationSchema.safeParse({
        ...validRegistration,
        emailMentor: '',
      }).success
    ).toBe(true);
    expect(
      userRegistrationSchema.safeParse({
        ...validRegistration,
        emailMentor: undefined,
      }).success
    ).toBe(true);

    const missingResponsible = userRegistrationSchema.safeParse({
      ...validRegistration,
      tipoUsuario: 'mentorado',
      emailMentor: '',
    });
    expect(missingResponsible.success).toBe(false);
    if (!missingResponsible.success) {
      expect(missingResponsible.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['emailMentor'],
            message: 'Informe o e-mail do responsável.',
          }),
        ])
      );
    }

    const malformedResponsible = userRegistrationSchema.safeParse({
      ...validRegistration,
      tipoUsuario: 'mentorado',
      emailMentor: 'email-invalido',
    });
    expect(malformedResponsible.success).toBe(false);
    if (!malformedResponsible.success) {
      expect(malformedResponsible.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['emailMentor'],
            message: 'Digite um email válido',
          }),
        ])
      );
    }
  });

  it.each(['', 'Administrador', 'Comum'])('rejects unsupported public roles: %j', (tipoUsuario) => {
    expect(
      userRegistrationSchema.safeParse({
        ...validRegistration,
        tipoUsuario,
      }).success
    ).toBe(false);
  });

  it.each(['', '   ', 'Indefinido', ' indefinido '])(
    'rejeita cidade invalida: %j',
    (cidade) => {
      const result = userRegistrationSchema.safeParse({
        ...validRegistration,
        cidade,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['cidade'],
              message: 'Informe uma cidade válida.',
            }),
          ])
        );
      }
    }
  );

  it.each(['E', 'E'.repeat(101)])(
    'rejeita curso fora do intervalo depois do trim',
    (curso) => {
      const result = userRegistrationSchema.safeParse({
        ...validRegistration,
        curso: ` ${curso} `,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: ['curso'] }),
          ])
        );
      }
    }
  );

  it.each(['ES', 'E'.repeat(100)])(
    'aceita curso nos limites depois do trim',
    (curso) => {
      expect(
        userRegistrationSchema.safeParse({
          ...validRegistration,
          curso: ` ${curso} `,
        }).success
      ).toBe(true);
    }
  );
});
