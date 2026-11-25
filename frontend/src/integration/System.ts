import { api } from '../services/BaseApi';

import { OPERATION_IDS } from '@/errors/errorCatalog';
import { reportAppError } from '@/errors/reportAppError';

type ProductQuantitiesProjection = Readonly<{
  Quimico: number;
  Vidraria: number;
  Outro: number;
  Total: number;
}>;

type SystemQuantitiesProjection = Readonly<{
  produtos: ProductQuantitiesProjection;
}>;

export const getSystemQuantities = async () => {
  try {

    const response = await api<SystemQuantitiesProjection>({
      method: 'GET',
      url: `System/quantities`,
    });

    const source = response.data;
    const projection: SystemQuantitiesProjection = {
      produtos: {
        Quimico: source.produtos.Quimico,
        Vidraria: source.produtos.Vidraria,
        Outro: source.produtos.Outro,
        Total: source.produtos.Total,
      },
    };

    return { ...response, data: projection };
  } catch (error) {
    throw reportAppError(error, OPERATION_IDS.systemQuantities);
  }
};
