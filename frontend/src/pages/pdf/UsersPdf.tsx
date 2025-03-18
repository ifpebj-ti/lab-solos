import { MyDocument } from '@/components/pdf/MyDocument';
import { PDFViewer } from '@react-pdf/renderer';

const LoanReport = () => {
  return (
    <PDFViewer style={{ width: '100%', height: '100vh' }}>
      <MyDocument />
    </PDFViewer>
  );
};

export default LoanReport;
