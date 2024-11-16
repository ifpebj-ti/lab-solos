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
const chartData = [
  { month: 'January', desktop: 186 },
  { month: 'February', desktop: 165 },
  { month: 'March', desktop: 197 },
  { month: 'April', desktop: 193 },
  { month: 'May', desktop: 209 },
  { month: 'June', desktop: 264 },
  { month: 'January', desktop: 146 },
  { month: 'February', desktop: 105 },
  { month: 'March', desktop: 237 },
  { month: 'April', desktop: 103 },
  { month: 'May', desktop: 209 },
  { month: 'June', desktop: 214 },
]
const chartConfig = {
  desktop: {
    label: 'Desktop',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

function Verification() {
  const isLoading = false;
  const infoItems = [
    { title: 'Item', value: 'Cloreto de Cálcio', width: '2/5' },
    { title: 'Fórmula', value: 'CaCL2', width: '1/5' },
    { title: 'Grupo', value: 'Sais', width: '1/5' },
    { title: 'Situação', value: 'Disponível', width: '1/5' },
  ];
  const infoItems2 = [
    { title: 'Estoque Atual', value: '+3,55', width: 'full' },
  ];
  const infoItems3 = [
    { title: 'Última Inserção', value: '10/08/2024 14:25', width: 'full' },
  ];
  const infoItems4 = [
    { title: 'Última Retirada', value: '29/11/2024 09:54', width: 'full' },
  ];

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
                <CardTitle className='font-inter-regular text-lg text-clt-2 font-medium'>Gráfico de Movimentação de Estoque</CardTitle>
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
        </div>
      )}
    </>
  );
}

export default Verification;
