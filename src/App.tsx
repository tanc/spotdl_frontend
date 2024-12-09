import { Tabs, Flowbite, type CustomFlowbiteTheme } from 'flowbite-react';
import DownloadTab from './components/DownloadTab';
import SettingsTab from './components/SettingsTab';
import Header from './components/Header';
import Footer from './components/Footer';

const customTheme: CustomFlowbiteTheme = {
  tabs: {
    base: "flex flex-col gap-2",
    tablist: {
      base: "flex text-center",
      styles: {
        default: "flex-wrap border-b border-gray-200 dark:border-gray-700",
      },
      tabitem: {
        base: "flex items-center justify-center p-4 rounded-t-lg text-sm font-medium first:ml-0 disabled:cursor-not-allowed disabled:text-gray-400 disabled:dark:text-gray-500 focus:ring-4 focus:ring-blue-300 focus:outline-none",
        styles: {
          default: {
            base: "rounded-t-lg",
            active: {
              on: "bg-gray-100 text-blue-900 dark:bg-gray-800 dark:text-blue-200",
              off: "text-gray-500 hover:bg-gray-50 hover:text-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            }
          }
        }
      }
    }
  }
};

function App() {
  return (
    <Flowbite theme={{ mode: 'auto', theme: customTheme }}>
      <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
        <div className="container mx-auto p-4 min-h-screen flex flex-col">
          <Header />
          
          <main className="flex-grow">
            <Tabs aria-label="SpotDL options">
              <Tabs.Item active title="Download">
                <DownloadTab />
              </Tabs.Item>
              <Tabs.Item title="Settings">
                <SettingsTab />
              </Tabs.Item>
            </Tabs>
          </main>

          <Footer />
        </div>
      </div>
    </Flowbite>
  );
}

export default App;
