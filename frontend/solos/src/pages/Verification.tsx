import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../public/icons/LoadingIcon';
import InfoContainer from '@/components/screens/InfoContainer';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import DateRangeInput from '@/components/global/inputs/DateRangeInput';
import SelectInput from '@/components/global/inputs/SelectInput';
import { useState } from 'react';
import { lotes, chartData, columnsVer, dataVer } from '@/mocks/Unidades';
import Pagination from '@/components/global/table/Pagination';
import SearchInput from '@/components/global/inputs/SearchInput';
import HeaderTable from '@/components/global/table/Header';
import ItemTable from '@/components/global/table/Item';
const chartConfig = {
  desktop: {
    label: 'Desktop',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

function Verification() {
  const isLoading = false;
  const [value, setValue] = useState('');
  const infoItems = [
    { title: 'Item', value: 'Cloreto de Cálcio', width: '40%' },
    { title: 'Fórmula', value: 'CaCL2', width: '20%' },
    { title: 'Grupo', value: 'Sais', width: '20%' },
    { title: 'Situação', value: 'Disponível', width: '20%' },
  ];
  const infoItems2 = [
    { title: 'Estoque Atual', value: '+3,55', width: '100%' },
  ];
  const infoItems3 = [
    { title: 'Última Inserção', value: '10/08/2024 14:25', width: '100%' },
  ];
  const infoItems4 = [
    { title: 'Última Retirada', value: '29/11/2024 09:54', width: '100%' },
  ];
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const currentData = dataVer.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <>
      {isLoading ? (
        <div className='flex justify-center flex-row w-full h-screen items-center gap-x-4 font-inter-medium text-clt-2 bg-backgroundMy'>
          <div className='animate-spin'>
            <LoadingIcon />
          </div>
          Carregando...
        </div>
      ) : (
        <div className='w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Pesquisa
            </h1>
            <div className='flex items-center justify-between'>
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 mt-7'>
            <InfoContainer items={infoItems} />
            <div className='w-full flex gap-x-8 mt-5'>
              <InfoContainer items={infoItems2} />
              <InfoContainer items={infoItems3} />
              <InfoContainer items={infoItems4} />
            </div>
            {/* <p>
              Fórmula da água: H<sub className='text-xs'>2</sub>O
            </p> */}
          </div>
          <div className='w-11/12 mt-7'>
            <Card className='rounded-md bg-backgroundMy border border-borderMy shadow-none'>
              <CardHeader>
                <div className='flex items-center justify-between w-full gap-x-7'>
                  <CardTitle className='font-inter-regular text-lg text-clt-2 font-medium w-1/2'>
                    Gráfico de Movimentação de Estoque
                  </CardTitle>
                  <div className='flex gap-x-7 w-1/2'>
                    <div className='w-1/2'>
                      <DateRangeInput />
                    </div>
                    <div className='-mt-4 w-1/2'>
                      <SelectInput
                        options={lotes}
                        onValueChange={(value) => setValue(value)}
                        value={value}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className='pt-4'>
                <ChartContainer config={chartConfig} className='w-full h-80'>
                  <LineChart
                    className='w-full'
                    accessibilityLayer
                    data={chartData}
                    margin={{
                      left: 12,
                      right: 12,
                    }}
                  >
                    <CartesianGrid vertical={false} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <XAxis
                      dataKey='month'
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Line
                      dataKey='desktop'
                      type='linear'
                      stroke='var(--color-desktop)'
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
          <div className='border border-borderMy rounded-md w-11/12 min-h-96 flex flex-col items-center mt-10 p-4 mb-11'>
            <div className='w-full flex justify-between items-center mt-2 gap-x-7'>
              <div className='w-2/4'>
                <SearchInput name='search' />
              </div>
              <div className='flex gap-x-7 w-1/2'>
                <div className='w-1/2'>
                  <DateRangeInput />
                </div>
                <div className='-mt-4 w-1/2'>
                  <SelectInput
                    options={lotes}
                    onValueChange={(value) => setValue(value)}
                    value={value}
                  />
                </div>
              </div>
            </div>
            <HeaderTable columns={columnsVer} />
            <div className='w-full items-center flex flex-col justify-between min-h-72'>
              <div className='w-full'>
                {currentData.map((rowData, index) => (
                  <ItemTable
                    key={index}
                    data={[
                      rowData.date,
                      rowData.name,
                      rowData.institution,
                      rowData.code,
                      rowData.quantity,
                    ]}
                    rowIndex={index}
                    columnWidths={columnsVer.map((column) => column.width)}
                  />
                ))}
              </div>
              {/* Componente de Paginação */}
              <Pagination
                totalItems={dataVer.length}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Verification;
