import { Page, Document, StyleSheet, Font, View } from '@react-pdf/renderer';
import { HeaderPdf } from './HeaderPdf';
import { LinePdf } from './Line';
import { HeaderDescription } from './HeaderDescription';
import { TitlePdf } from './TitlePdf';
import { DescriptionPdf } from './Description';
import { HeaderTablePdf } from './table/Header';
import { ItemTablePdf } from './table/Item';
import { ToSign } from './ToSign';

type Column = {
  value: string;
  width: string;
};

type TableProps = {
  columns: Column[];
  title: string;
  data: string[][]; // Agora aceita um array bidimensional
  name: string;
  nivel: string;
  columnWidths: string[]; // Larguras dinâmicas das colunas
  signer: string;
};

Font.register({
  family: 'fontPadrao',
  src: '../../../public/fonts/Rajdhani/Rajdhani-SemiBold.ttf', // Caminho da fonte dentro do projeto
});

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#f4f4f5',
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: 25,
    paddingRight: 25,
    fontFamily: 'fontPadrao',
  },
  section: {
    padding: 10,
    backgroundColor: '#b5b5b5',
  },
  container: {
    borderBottom: 1,
    borderLeft: 1,
    borderRight: 1,
    borderColor: '#b5b5b5',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  sign: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

// Create Document Component
export const MyDocument = ({
  columns,
  title,
  data,
  columnWidths,
  name,
  nivel,
  signer,
}: TableProps) => (
  <Document>
    <Page size='A4' style={styles.page}>
      <HeaderPdf />
      <LinePdf />
      <HeaderDescription name={name} nivel={nivel} />
      <LinePdf />
      <TitlePdf children={title} />
      <DescriptionPdf />
      <HeaderTablePdf columns={columns} />
      <View style={styles.container}>
        {data.map((datax, index) => (
          <ItemTablePdf
            key={index}
            data={Array.isArray(datax) ? datax : [datax]} // Garante que seja um array de strings
            rowIndex={index}
            columnWidths={columnWidths}
          />
        ))}
      </View>
      <View style={styles.sign}>
        <ToSign name={signer} />
      </View>
    </Page>
  </Document>
);
