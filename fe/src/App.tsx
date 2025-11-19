import Layout from './components/Layout';
import StatisticalReport from './components/StatisticalReport.tsx';
import FileProcessor from './components/FileProcessor';
import TwoLayerPdf from './components/TwoLayerPdf.tsx';

function App() {
  return (
    <Layout>
      {(page) => {
        switch (page) {
          case 'statistics':
            return <StatisticalReport />;
          case 'qrcode':
            return <FileProcessor title="Đặt tên theo QR code" processType="qrcode" />;
          case 'barcode':
            return <FileProcessor title="Đặt tên theo Barcode" processType="barcode" />;
          case 'pdf':
            return <TwoLayerPdf />;
          default:
            return <StatisticalReport />;
        }
      }}
    </Layout>
  );
}

export default App;
