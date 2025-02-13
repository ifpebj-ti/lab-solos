[
  {
    id: 1,
    dataRealizacao: '2025-01-27T20:59:04.065918',
    dataDevolucao: '2025-02-10T20:59:04.0659889',
    dataAprovacao: '2025-02-03T20:59:04.0660613',
    status: 'Aprovado',
    emprestimoProdutos: [
      {
        id: 1,
        emprestimoId: 1,
        emprestimo: null,
        produtoId: 1,
        produto: {
          id: 1,
          nomeProduto: 'Ácido Sulfúrico',
          fornecedor: 'Fornecedor Químico XYZ',
          tipo: 'Quimico',
          quantidade: 40,
          quantidadeMinima: 50,
          dataFabricacao: null,
          dataValidade: '2026-02-03T17:59:04.1141608',
          localizacaoProduto: 'Prateleira A',
          status: 'Solicitado',
          ultimaModificacao: '0001-01-01T00:00:00',
          loteId: 1,
          lote: null,
          emprestimoProdutos: [
            null,
            {
              id: 0,
              emprestimoId: 12,
              emprestimo: {
                id: 12,
                dataRealizacao: '2025-02-13T11:16:31.2866121',
                dataDevolucao: '2025-02-17T00:00:00',
                dataAprovacao: null,
                status: 'Pendente',
                emprestimoProdutos: [null],
                solicitanteId: 3,
                solicitante: {
                  id: 3,
                  nomeCompleto: 'Aluno Exemplo',
                  email: 'aluno@exemplo.com',
                  senhaHash:
                    'AQAAAAIAAYagAAAAELd8HLqewd5aMbA90Lw9e4slazcriKl6DAH8EKCQbV3FiUNt7wOknRVN5eGyVIvsRA==',
                  telefone: '5566778899',
                  dataIngresso: '2025-02-03T20:59:03.8434562',
                  nivelUsuario: 'Mentorado',
                  tipoUsuario: 'Academico',
                  status: 'Habilitado',
                  emprestimosSolicitados: [null, null],
                  emprestimosAprovados: null,
                  responsavelId: 2,
                  responsavel: {
                    id: 2,
                    nomeCompleto: 'Professor Exemplo',
                    email: 'mentor@exemplo.com',
                    senhaHash:
                      'AQAAAAIAAYagAAAAENtsj4mxBj5evOYZXqrK9C5/TXLVUs2BzEzMd+xmKtBTEl4bvy+7pf7J4BurdRESLA==',
                    telefone: '987654321',
                    dataIngresso: '2025-02-03T20:59:03.6824626',
                    nivelUsuario: 'Mentor',
                    tipoUsuario: 'Academico',
                    status: 'Habilitado',
                    emprestimosSolicitados: null,
                    emprestimosAprovados: [null],
                    responsavelId: 1,
                    responsavel: {
                      id: 1,
                      nomeCompleto: 'Administrador Exemplo',
                      email: 'admin@exemplo.com',
                      senhaHash:
                        'AQAAAAIAAYagAAAAEAKtAmW0pV/1oi3rxmBXH6jQbtAIw9/l+ofICEJfk3t6/jb3cs4uYUkBHAYZo1flxw==',
                      telefone: '123456789',
                      dataIngresso: '2025-02-03T20:59:03.5771479',
                      nivelUsuario: 'Administrador',
                      tipoUsuario: 'Administrador',
                      status: 'Habilitado',
                      emprestimosSolicitados: null,
                      emprestimosAprovados: null,
                      responsavelId: null,
                      responsavel: null,
                      dependentes: [null],
                    },
                    dependentes: [
                      null,
                      {
                        id: 5,
                        nomeCompleto: 'Usuario Teste2',
                        email: 'usuario.teste2@exemplo.com',
                        senhaHash:
                          'AQAAAAIAAYagAAAAEIDObVyaSTm00uxr24IszmNKnPozq+Jg++GGVk4B45rAs09u38DQMNpNUWFlGIE2Ng==',
                        telefone: '123456789',
                        dataIngresso: '2025-02-13T09:29:08.2861445',
                        nivelUsuario: 'Mentorado',
                        tipoUsuario: 'Academico',
                        status: 'Desabilitado',
                        emprestimosSolicitados: null,
                        emprestimosAprovados: null,
                        responsavelId: 2,
                        responsavel: null,
                        dependentes: null,
                      },
                      {
                        id: 6,
                        nomeCompleto: 'Mara Maravilha',
                        email: 'maravilha@gmail.com',
                        senhaHash:
                          'AQAAAAIAAYagAAAAEJ9EadtVUoyPfEzLqQNsnqAvEONYw0IWqOkc0k5GWLQeuw/GLyTKfiVF04uNwx1kdw==',
                        telefone: '81982556698',
                        dataIngresso: '2025-02-13T12:13:29.5498482',
                        nivelUsuario: 'Mentorado',
                        tipoUsuario: 'Academico',
                        status: 'Habilitado',
                        emprestimosSolicitados: null,
                        emprestimosAprovados: null,
                        responsavelId: 2,
                        responsavel: null,
                        dependentes: null,
                      },
                    ],
                  },
                  dependentes: null,
                },
                aprovadorId: null,
                aprovador: null,
              },
              produtoId: 1,
              produto: null,
              quantidade: 10,
            },
          ],
        },
        quantidade: 500,
      },
      {
        id: 3,
        emprestimoId: 1,
        emprestimo: null,
        produtoId: 3,
        produto: {
          id: 3,
          nomeProduto: 'Béquer Borossilicato 500ml',
          fornecedor: 'Fornecedor Vidraria ABC',
          tipo: 'Vidraria',
          quantidade: 10,
          quantidadeMinima: 10,
          dataFabricacao: null,
          dataValidade: null,
          localizacaoProduto: 'Armário Vidraria',
          status: 'Solicitado',
          ultimaModificacao: '0001-01-01T00:00:00',
          loteId: 2,
          lote: null,
          emprestimoProdutos: [null],
        },
        quantidade: 2,
      },
      {
        id: 5,
        emprestimoId: 1,
        emprestimo: null,
        produtoId: 5,
        produto: {
          id: 5,
          nomeProduto: 'Mop',
          fornecedor: 'Fornecedor Limpeza RST',
          tipo: 'Outro',
          quantidade: 0,
          quantidadeMinima: 1,
          dataFabricacao: null,
          dataValidade: null,
          localizacaoProduto: 'Jogado, por aí',
          status: 'Solicitado',
          ultimaModificacao: '0001-01-01T00:00:00',
          loteId: null,
          lote: null,
          emprestimoProdutos: [null],
        },
        quantidade: 1,
      },
    ],
    solicitanteId: 3,
    solicitante: {
      id: 3,
      nomeCompleto: 'Aluno Exemplo',
      email: 'aluno@exemplo.com',
      senhaHash:
        'AQAAAAIAAYagAAAAELd8HLqewd5aMbA90Lw9e4slazcriKl6DAH8EKCQbV3FiUNt7wOknRVN5eGyVIvsRA==',
      telefone: '5566778899',
      dataIngresso: '2025-02-03T20:59:03.8434562',
      nivelUsuario: 'Mentorado',
      tipoUsuario: 'Academico',
      status: 'Habilitado',
      emprestimosSolicitados: [
        null,
        {
          id: 12,
          dataRealizacao: '2025-02-13T11:16:31.2866121',
          dataDevolucao: '2025-02-17T00:00:00',
          dataAprovacao: null,
          status: 'Pendente',
          emprestimoProdutos: [
            {
              id: 0,
              emprestimoId: 12,
              emprestimo: null,
              produtoId: 1,
              produto: {
                id: 1,
                nomeProduto: 'Ácido Sulfúrico',
                fornecedor: 'Fornecedor Químico XYZ',
                tipo: 'Quimico',
                quantidade: 40,
                quantidadeMinima: 50,
                dataFabricacao: null,
                dataValidade: '2026-02-03T17:59:04.1141608',
                localizacaoProduto: 'Prateleira A',
                status: 'Solicitado',
                ultimaModificacao: '0001-01-01T00:00:00',
                loteId: 1,
                lote: null,
                emprestimoProdutos: [
                  {
                    id: 1,
                    emprestimoId: 1,
                    emprestimo: null,
                    produtoId: 1,
                    produto: null,
                    quantidade: 500,
                  },
                  null,
                ],
              },
              quantidade: 10,
            },
          ],
          solicitanteId: 3,
          solicitante: null,
          aprovadorId: null,
          aprovador: null,
        },
      ],
      emprestimosAprovados: null,
      responsavelId: 2,
      responsavel: {
        id: 2,
        nomeCompleto: 'Professor Exemplo',
        email: 'mentor@exemplo.com',
        senhaHash:
          'AQAAAAIAAYagAAAAENtsj4mxBj5evOYZXqrK9C5/TXLVUs2BzEzMd+xmKtBTEl4bvy+7pf7J4BurdRESLA==',
        telefone: '987654321',
        dataIngresso: '2025-02-03T20:59:03.6824626',
        nivelUsuario: 'Mentor',
        tipoUsuario: 'Academico',
        status: 'Habilitado',
        emprestimosSolicitados: null,
        emprestimosAprovados: [null],
        responsavelId: 1,
        responsavel: {
          id: 1,
          nomeCompleto: 'Administrador Exemplo',
          email: 'admin@exemplo.com',
          senhaHash:
            'AQAAAAIAAYagAAAAEAKtAmW0pV/1oi3rxmBXH6jQbtAIw9/l+ofICEJfk3t6/jb3cs4uYUkBHAYZo1flxw==',
          telefone: '123456789',
          dataIngresso: '2025-02-03T20:59:03.5771479',
          nivelUsuario: 'Administrador',
          tipoUsuario: 'Administrador',
          status: 'Habilitado',
          emprestimosSolicitados: null,
          emprestimosAprovados: null,
          responsavelId: null,
          responsavel: null,
          dependentes: [null],
        },
        dependentes: [
          null,
          {
            id: 5,
            nomeCompleto: 'Usuario Teste2',
            email: 'usuario.teste2@exemplo.com',
            senhaHash:
              'AQAAAAIAAYagAAAAEIDObVyaSTm00uxr24IszmNKnPozq+Jg++GGVk4B45rAs09u38DQMNpNUWFlGIE2Ng==',
            telefone: '123456789',
            dataIngresso: '2025-02-13T09:29:08.2861445',
            nivelUsuario: 'Mentorado',
            tipoUsuario: 'Academico',
            status: 'Desabilitado',
            emprestimosSolicitados: null,
            emprestimosAprovados: null,
            responsavelId: 2,
            responsavel: null,
            dependentes: null,
          },
          {
            id: 6,
            nomeCompleto: 'Mara Maravilha',
            email: 'maravilha@gmail.com',
            senhaHash:
              'AQAAAAIAAYagAAAAEJ9EadtVUoyPfEzLqQNsnqAvEONYw0IWqOkc0k5GWLQeuw/GLyTKfiVF04uNwx1kdw==',
            telefone: '81982556698',
            dataIngresso: '2025-02-13T12:13:29.5498482',
            nivelUsuario: 'Mentorado',
            tipoUsuario: 'Academico',
            status: 'Habilitado',
            emprestimosSolicitados: null,
            emprestimosAprovados: null,
            responsavelId: 2,
            responsavel: null,
            dependentes: null,
          },
        ],
      },
      dependentes: null,
    },
    aprovadorId: 2,
    aprovador: {
      id: 2,
      nomeCompleto: 'Professor Exemplo',
      email: 'mentor@exemplo.com',
      senhaHash:
        'AQAAAAIAAYagAAAAENtsj4mxBj5evOYZXqrK9C5/TXLVUs2BzEzMd+xmKtBTEl4bvy+7pf7J4BurdRESLA==',
      telefone: '987654321',
      dataIngresso: '2025-02-03T20:59:03.6824626',
      nivelUsuario: 'Mentor',
      tipoUsuario: 'Academico',
      status: 'Habilitado',
      emprestimosSolicitados: null,
      emprestimosAprovados: [null],
      responsavelId: 1,
      responsavel: {
        id: 1,
        nomeCompleto: 'Administrador Exemplo',
        email: 'admin@exemplo.com',
        senhaHash:
          'AQAAAAIAAYagAAAAEAKtAmW0pV/1oi3rxmBXH6jQbtAIw9/l+ofICEJfk3t6/jb3cs4uYUkBHAYZo1flxw==',
        telefone: '123456789',
        dataIngresso: '2025-02-03T20:59:03.5771479',
        nivelUsuario: 'Administrador',
        tipoUsuario: 'Administrador',
        status: 'Habilitado',
        emprestimosSolicitados: null,
        emprestimosAprovados: null,
        responsavelId: null,
        responsavel: null,
        dependentes: [null],
      },
      dependentes: [
        {
          id: 3,
          nomeCompleto: 'Aluno Exemplo',
          email: 'aluno@exemplo.com',
          senhaHash:
            'AQAAAAIAAYagAAAAELd8HLqewd5aMbA90Lw9e4slazcriKl6DAH8EKCQbV3FiUNt7wOknRVN5eGyVIvsRA==',
          telefone: '5566778899',
          dataIngresso: '2025-02-03T20:59:03.8434562',
          nivelUsuario: 'Mentorado',
          tipoUsuario: 'Academico',
          status: 'Habilitado',
          emprestimosSolicitados: [
            null,
            {
              id: 12,
              dataRealizacao: '2025-02-13T11:16:31.2866121',
              dataDevolucao: '2025-02-17T00:00:00',
              dataAprovacao: null,
              status: 'Pendente',
              emprestimoProdutos: [
                {
                  id: 0,
                  emprestimoId: 12,
                  emprestimo: null,
                  produtoId: 1,
                  produto: {
                    id: 1,
                    nomeProduto: 'Ácido Sulfúrico',
                    fornecedor: 'Fornecedor Químico XYZ',
                    tipo: 'Quimico',
                    quantidade: 40,
                    quantidadeMinima: 50,
                    dataFabricacao: null,
                    dataValidade: '2026-02-03T17:59:04.1141608',
                    localizacaoProduto: 'Prateleira A',
                    status: 'Solicitado',
                    ultimaModificacao: '0001-01-01T00:00:00',
                    loteId: 1,
                    lote: null,
                    emprestimoProdutos: [
                      {
                        id: 1,
                        emprestimoId: 1,
                        emprestimo: null,
                        produtoId: 1,
                        produto: null,
                        quantidade: 500,
                      },
                      null,
                    ],
                  },
                  quantidade: 10,
                },
              ],
              solicitanteId: 3,
              solicitante: null,
              aprovadorId: null,
              aprovador: null,
            },
          ],
          emprestimosAprovados: null,
          responsavelId: 2,
          responsavel: null,
          dependentes: null,
        },
        {
          id: 5,
          nomeCompleto: 'Usuario Teste2',
          email: 'usuario.teste2@exemplo.com',
          senhaHash:
            'AQAAAAIAAYagAAAAEIDObVyaSTm00uxr24IszmNKnPozq+Jg++GGVk4B45rAs09u38DQMNpNUWFlGIE2Ng==',
          telefone: '123456789',
          dataIngresso: '2025-02-13T09:29:08.2861445',
          nivelUsuario: 'Mentorado',
          tipoUsuario: 'Academico',
          status: 'Desabilitado',
          emprestimosSolicitados: null,
          emprestimosAprovados: null,
          responsavelId: 2,
          responsavel: null,
          dependentes: null,
        },
        {
          id: 6,
          nomeCompleto: 'Mara Maravilha',
          email: 'maravilha@gmail.com',
          senhaHash:
            'AQAAAAIAAYagAAAAEJ9EadtVUoyPfEzLqQNsnqAvEONYw0IWqOkc0k5GWLQeuw/GLyTKfiVF04uNwx1kdw==',
          telefone: '81982556698',
          dataIngresso: '2025-02-13T12:13:29.5498482',
          nivelUsuario: 'Mentorado',
          tipoUsuario: 'Academico',
          status: 'Habilitado',
          emprestimosSolicitados: null,
          emprestimosAprovados: null,
          responsavelId: 2,
          responsavel: null,
          dependentes: null,
        },
      ],
    },
  },
];
