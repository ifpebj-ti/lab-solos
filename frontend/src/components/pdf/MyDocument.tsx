import { Page, Document, StyleSheet, Font, View } from '@react-pdf/renderer';
import { HeaderPdf } from './HeaderPdf';
import { LinePdf } from './Line';
import { HeaderDescription } from './HeaderDescription';
import { TitlePdf } from './TitlePdf';
import { DescriptionPdf } from './Description';
import { HeaderTablePdf } from './table/Header';
import { ItemTablePdf } from './table/Item';
import { ToSign } from './ToSign';

Font.register({
  family: 'fontPadrao',
  src: '../../../public/fonts/Rajdhani/Rajdhani-SemiBold.ttf', // Caminho da fonte dentro do projeto
});

const columns = [
  { value: 'Nome', width: '40%' },
  { value: 'Nível', width: '15%' },
  { value: 'Ingresso', width: '15%' },
  { value: 'Status', width: '15%' },
  { value: 'ID Responsável', width: '15%' },
];

const columnWidths = ['40%', '15%', '15%', '15%', '15%'];
const rowData = [
  ['Notebook Dell', '5', 'Disponível', 'Habilitado', '22'],
  ['Mouse Logitech', '10', 'Emprestado', 'Habilitado', '22'],
  ['Notebook Dell', '5', 'Disponível', 'Habilitado', '22'],
  ['Mouse Logitech', '10', 'Emprestado', 'Habilitado', '22'],
  ['Notebook Dell', '5', 'Disponível', 'Habilitado', '22'],
  ['Mouse Logitech', '10', 'Emprestado', 'Habilitado', '22'],
  ['Notebook Dell', '5', 'Disponível', 'Habilitado', '22'],
];

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
export const MyDocument = () => (
  <Document>
    <Page size='A4' style={styles.page}>
      <HeaderPdf />
      <LinePdf />
      <HeaderDescription />
      <LinePdf />
      <TitlePdf children='Usuários Cadastrados' />
      <DescriptionPdf />
      <HeaderTablePdf columns={columns} />
      <View style={styles.container}>
        {rowData.map((data, index) => (
          <ItemTablePdf
            key={index}
            data={data}
            rowIndex={index}
            columnWidths={columnWidths}
          />
        ))}
      </View>
      <View style={styles.sign}>
        <ToSign />
        <ToSign />
      </View>
    </Page>
  </Document>
);
