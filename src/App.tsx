import { Tabs } from 'flowbite-react';
import DownloadTab from './components/DownloadTab';
import SettingsTab from './components/SettingsTab';

function App() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">SpotDL Frontend</h1>
      
      <Tabs aria-label="SpotDL options">
        <Tabs.Item active title="Download">
          <DownloadTab />
        </Tabs.Item>
        <Tabs.Item title="Settings">
          <SettingsTab />
        </Tabs.Item>
      </Tabs>
    </div>
  );
}

export default App;
