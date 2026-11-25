import { render, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { server } from '@/test/msw/server';
import VerificationPage from './VerificationPage';

vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));
vi.mock('@/components/modals/ProductEditModal', () => ({ default: () => null }));

const PRODUCT_URL = 'http://localhost:8080/api/Produtos/42';

describe('consulta de identificação do químico', () => {
  it.each([
    ['Marca sintética', 'Oxido', '2H₂O'],
    ['Marca histórica', 'Indefinido', '2H2O'],
  ])('apresenta a marca %s, o grupo %s e a fórmula %s recuperados', async (fornecedor, grupo, formulaQuimica) => {
    server.use(
      http.get(PRODUCT_URL, () =>
        HttpResponse.json({
          id: 42,
          nomeProduto: 'Químico sintético',
          tipoProduto: 'Quimico',
          fornecedor,
          grupo,
          formulaQuimica,
          status: 'Disponivel',
        })
      ),
      http.get(`${PRODUCT_URL}/historico-saida`, () =>
        HttpResponse.json({ historico: [] })
      )
    );

    render(
      <MemoryRouter initialEntries={['/verification?id=42']}>
        <VerificationPage userType='admin' />
      </MemoryRouter>
    );

    const produto = within(await screen.findByRole('listitem'));
    const marca = produto.getByText('Marca', { selector: 'dt' });
    const grupoLabel = produto.getByText('Grupo', { selector: 'dt' });
    const formula = produto.getByText('Fórmula', { selector: 'dt' });
    expect(marca.nextElementSibling).toHaveTextContent(fornecedor);
    expect(grupoLabel.nextElementSibling).toHaveTextContent(grupo);
    expect(formula.nextElementSibling?.textContent).toBe(formulaQuimica);
  });

  it.each(['admin', 'mentor', 'mentee'] as const)(
    'apresenta Peso Molecular em g/mol para o perfil %s',
    async (userType) => {
      server.use(
        http.get(PRODUCT_URL, () =>
          HttpResponse.json({
            id: 42,
            nomeProduto: 'Químico com massa molar',
            tipoProduto: 'Quimico',
            pesoMolecular: 18.015,
            formulaQuimica: 'H2O',
            grupo: 'Oxido',
            status: 'Disponivel',
          })
        ),
        http.get(`${PRODUCT_URL}/historico-saida`, () =>
          HttpResponse.json({ historico: [] })
        )
      );

      render(
        <MemoryRouter initialEntries={['/verification?id=42']}>
          <VerificationPage userType={userType} />
        </MemoryRouter>
      );

      const produto = within(await screen.findByRole('listitem'));
      const peso = produto.getByText('Peso Molecular (g/mol)', { selector: 'dt' });
      expect(peso.nextElementSibling).toHaveTextContent('18,015');
    }
  );

  it('identifica a ausência histórica do Peso Molecular sem inventar valor', async () => {
    server.use(
      http.get(PRODUCT_URL, () =>
        HttpResponse.json({
          id: 42,
          nomeProduto: 'Químico histórico sem massa molar',
          tipoProduto: 'Quimico',
          pesoMolecular: null,
          grupo: 'Indefinido',
          status: 'Disponivel',
        })
      ),
      http.get(`${PRODUCT_URL}/historico-saida`, () =>
        HttpResponse.json({ historico: [] })
      )
    );

    render(
      <MemoryRouter initialEntries={['/verification?id=42']}>
        <VerificationPage userType='admin' />
      </MemoryRouter>
    );

    const produto = within(await screen.findByRole('listitem'));
    const peso = produto.getByText('Peso Molecular (g/mol)', { selector: 'dt' });
    expect(peso.nextElementSibling).toHaveTextContent('Não informado');
  });
});

describe('consulta de identificação da vidraria', () => {
  it.each([
    {
      nomeProduto: 'Vidraria recém-cadastrada',
      formato: 'Conica',
      categoria: 'Cônica',
      altura: 'Indefinido',
      alturaExibida: null,
    },
    {
      nomeProduto: 'Vidraria histórica',
      formato: 'TuboFormaU',
      categoria: 'Tubo em Forma de U',
      altura: 'Intermediaria',
      alturaExibida: 'Intermediária',
    },
  ])('apresenta os dados de $nomeProduto', async ({ nomeProduto, formato, categoria, altura, alturaExibida }) => {
    server.use(
      http.get(PRODUCT_URL, () =>
        HttpResponse.json({
          id: 42,
          nomeProduto,
          tipoProduto: 'Vidraria',
          formato,
          altura,
          status: 'Disponivel',
        })
      ),
      http.get(`${PRODUCT_URL}/historico-saida`, () =>
        HttpResponse.json({ historico: [] })
      )
    );

    render(
      <MemoryRouter initialEntries={['/verification?id=42']}>
        <VerificationPage userType='admin' />
      </MemoryRouter>
    );

    const produto = within(await screen.findByRole('listitem'));
    const categoriaLabel = produto.getByText('Categoria', { selector: 'dt' });
    const alturaLabel = produto.queryByText('Altura', { selector: 'dt' });
    expect(categoriaLabel.nextElementSibling).toHaveTextContent(categoria);
    expect(produto.queryByText('Grupo', { selector: 'dt' })).not.toBeInTheDocument();
    if (alturaExibida) {
      expect(alturaLabel?.nextElementSibling).toHaveTextContent(alturaExibida);
    } else {
      expect(alturaLabel).not.toBeInTheDocument();
    }
  });
});
