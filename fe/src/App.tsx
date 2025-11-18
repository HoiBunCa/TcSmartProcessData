import Layout from './components/Layout';
import StatisticalReport from './pages/StatisticalReport';
import FileProcessor from './components/FileProcessor';
import TwoLayerPdf from './pages/TwoLayerPdf';

function App() {
  return (
    <Layout>
      {(page) => {
        switch (page) {
          case 'statistics':
            return <StatisticalReport />;
          case 'qrcode':
            return <FileProcessor title="Naming by QRcode" processType="qrcode" />;
          case 'barcode':
            return <FileProcessor title="Naming by Barcode" processType="barcode" />;
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
