import Layout from './components/Layout';
import StatisticalReport from './components/StatisticalReport.tsx';
import UnifiedFileWorkflow from './components/UnifiedFileWorkflow.tsx';
import Settings from './components/Settings.tsx';

function App() {
  return (
    <Layout>
      {(page) => {
        switch (page) {
          case 'statistics':
            return <StatisticalReport />;
          case 'workflow':
            return <UnifiedFileWorkflow />;
          case 'settings':
            return <Settings />;
          default:
            return <StatisticalReport />;
        }
      }}
    </Layout>
  );
}

export default App;
