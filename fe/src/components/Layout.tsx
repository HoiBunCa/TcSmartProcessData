import { useMemo, useState } from 'react';
import { BarChart3, Settings as SettingsIcon, Workflow, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

type Page = 'statistics' | 'workflow' | 'settings';

interface LayoutProps {
  children: (page: Page) => React.ReactNode;
}

const menuItems = [
  { id: 'statistics' as Page, label: 'Thống kê', icon: BarChart3 },
  { id: 'workflow' as Page, label: 'Xử lý file', icon: Workflow },
  { id: 'settings' as Page, label: 'Cài đặt', icon: SettingsIcon },
];

export default function Layout({ children }: LayoutProps) {
  const [currentPage, setCurrentPage] = useState<Page>('workflow');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const sidebarWidthClass = useMemo(
    () => (isSidebarCollapsed ? 'w-16' : 'w-64'),
    [isSidebarCollapsed]
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <aside
        className={`${sidebarWidthClass} bg-white border-r border-gray-200 flex flex-col transition-[width] duration-200`}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-2">
          {!isSidebarCollapsed && (
            <h1 className="text-xl font-semibold text-gray-800 truncate">File Processing</h1>
          )}
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((v) => !v)}
            className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>
        </div>
        <nav className={isSidebarCollapsed ? 'flex-1 p-2' : 'flex-1 p-4'}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                title={isSidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-3' : 'gap-3 px-4'} py-3 rounded-lg mb-2 transition-colors ${isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <Icon className="w-5 h-5" />
                {!isSidebarCollapsed && (
                  <span className="font-medium truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        {children(currentPage)}
      </main>
    </div>
  );
}
