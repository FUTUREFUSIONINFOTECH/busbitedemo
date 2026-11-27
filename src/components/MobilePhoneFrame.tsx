
import type { ReactNode } from 'react';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Lock,
  RefreshCw,
  Share,
  MoreHorizontal,
} from 'lucide-react';

import { useLanguage } from '../i18n/indianLanguages';

export interface MobileNavTab<T extends string> {
  id: T;
  label: string;
  icon: ReactNode;
  badgeCount?: number;
}

export interface MobileBrowserConfig {
  url: string;
  onSwitchToApp?: () => void;
  onRefresh?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onBack?: () => void;
  onForward?: () => void;
}

interface MobilePhoneFrameProps<T extends string> {
  appName: string;
  subtitle: string;
  brandIcon: ReactNode;
  unreadNotifications?: number;
  onBellClick?: () => void;
  tabs: MobileNavTab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  topBarSlot?: ReactNode;
  browserConfig?: MobileBrowserConfig;
  children: ReactNode;
  overlay?: ReactNode;
}

export function MobilePhoneFrame<T extends string>({
  appName,
  subtitle,
  brandIcon,
  unreadNotifications = 0,
  onBellClick,
  tabs,
  activeTab,
  onTabChange,
  topBarSlot,
  browserConfig,
  children,
  overlay,
}: MobilePhoneFrameProps<T>) {
  const { tr } = useLanguage();

  const isBrowser = Boolean(browserConfig);
  const hasTabs = tabs.length > 0;

  // Normal smartphone size: 375 x 667.
  // Scales down proportionally on smaller screens.
// Standard mobile phone preview: 340 x 640
const phoneFrameStyle = {
  width:
    'min(340px, calc((100dvh - 180px) * 340 / 640), calc(100vw - 32px))',
  aspectRatio: '340 / 640',
  maxHeight: 'calc(100dvh - 180px)',
  flexShrink: 0,
};

  return (
  <div className="
  min-h-[calc(100dvh-108px)]
  w-full
  flex flex-col items-center justify-start
  gap-3
  overflow-x-hidden
  bg-[#EDF2EF]
  px-3 py-3
">
      {/* OPTIONAL TOP BAR */}

      {topBarSlot && (
  <div className="w-full max-w-[375px] shrink-0 flex justify-center items-center">
    {topBarSlot}
  </div>
)}

      {/* SMARTPHONE FRAME */}

      <div
        className="relative mx-auto shrink-0"
        style={phoneFrameStyle}
      >

        {/* SIDE BUTTONS */}

        <span
          aria-hidden="true"
          className="
            hidden sm:block absolute
            -left-[3px] top-[16%]
            h-7 w-[3px] rounded-l-sm bg-[#1D352B]
          "
        />

        <span
          aria-hidden="true"
          className="
            hidden sm:block absolute
            -left-[3px] top-[23%]
            h-10 w-[3px] rounded-l-sm bg-[#1D352B]
          "
        />

        <span
          aria-hidden="true"
          className="
            hidden sm:block absolute
            -right-[3px] top-[20%]
            h-12 w-[3px] rounded-r-sm bg-[#1D352B]
          "
        />

        {/* PHONE BODY */}

        <div className="
          relative flex h-full w-full flex-col
          overflow-hidden rounded-[36px]
          border-[4px] border-[#0E1E17]
          bg-[#0E1E17]
          shadow-[0_20px_50px_rgba(6,78,59,0.20)]
          ring-1 ring-black/10
        ">

          {/* PHONE DISPLAY */}

          <div className="
            relative flex h-full min-h-0 min-w-0
            flex-1 flex-col overflow-hidden
            rounded-[32px] bg-[#F5F8F6]
            text-slate-900
          ">

            {/* DYNAMIC ISLAND */}

            <div
              aria-hidden="true"
              className="
                pointer-events-none absolute
                left-1/2 top-2 z-[70]
                flex h-[14px] w-[68px]
                -translate-x-1/2
                items-center justify-end
                rounded-full bg-[#0E1E17] pr-2
              "
            >
              <span className="
                h-1.5 w-1.5 rounded-full
                bg-emerald-950 ring-1 ring-emerald-500/30
              " />
            </div>

            {/* STATUS BAR */}

            <div className="
              z-[60] flex h-[30px] shrink-0
              items-center justify-between
              bg-white px-5
              text-[10px] font-semibold
              tracking-tight text-[#064E3B]
            ">
              <span className="font-mono tabular-nums">
                9:41
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold">
                  5G
                </span>

                <span className="inline-flex items-center gap-0.5">
                  <span className="
                    h-[8px] w-[14px] rounded-[2px]
                    border border-current p-[1px]
                  ">
                    <span className="
                      block h-full w-full
                      rounded-[1px] bg-current
                    " />
                  </span>
                  <span className="
                    h-[3px] w-[1.5px]
                    rounded-r-sm bg-current
                  " />
                </span>
              </div>
            </div>

            {/* BROWSER ADDRESS BAR */}

            {browserConfig ? (
              <div className="
                z-50 shrink-0 space-y-1.5
                border-b border-slate-200
                bg-white px-2.5 pb-2 pt-1
              ">

                {browserConfig.onSwitchToApp && (
                  <div className="
                    flex items-center justify-between gap-1.5
                    rounded-lg border border-emerald-200/80
                    bg-emerald-50 px-2 py-1
                  ">
                    <div className="
                      flex min-w-0 items-center gap-1.5
                    ">
                      <div className="
                        flex h-5 w-5 shrink-0 items-center
                        justify-center rounded-md
                        bg-emerald-800 text-white
                      ">
                        <BusIcon />
                      </div>

                      <div className="min-w-0">
                        <div className="
                          truncate text-[9px]
                          font-bold text-emerald-950
                        ">
                          {tr('BusBite App')}
                        </div>
                        <div className="
                          truncate text-[8px] text-emerald-700
                        ">
                          {tr('Mobile Browser')}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={browserConfig.onSwitchToApp}
                      className="
                        shrink-0 rounded bg-emerald-800
                        px-2 py-1 text-[9px]
                        font-semibold text-white
                        hover:bg-emerald-900
                      "
                    >
                      {tr('Open App')}
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <div className="
                    flex min-w-0 flex-1 items-center gap-1
                    rounded-full border border-slate-200
                    bg-slate-100 px-2.5 py-1.5
                  ">
                    <Lock className="
                      h-2.5 w-2.5 shrink-0 text-emerald-700
                    " />

                    <span className="
                      flex-1 truncate font-mono
                      text-[10px] text-slate-800
                    ">
                      {browserConfig.url}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={browserConfig.onRefresh}
                    aria-label="Reload page"
                    className="
                      flex h-7 w-7 shrink-0
                      items-center justify-center
                      rounded-full bg-slate-100 text-slate-600
                      hover:bg-slate-200
                    "
                  >
                    <RefreshCw size={12} />
                  </button>
                </div>
              </div>
            ) : (

              /* NATIVE APP HEADER */

              <div className="
                z-50 flex shrink-0 items-center
                justify-between gap-2
                border-b border-slate-200/75
                bg-white px-3 py-2
              ">
                <div className="
                  flex min-w-0 items-center gap-2
                ">
                  <div className="
                    flex h-9 w-9 shrink-0 items-center
                    justify-center overflow-hidden
                    rounded-xl border border-emerald-200/70
                    bg-emerald-50
                  ">
                    {brandIcon}
                  </div>

                  <div className="min-w-0">
                    <div className="
                      truncate text-[13px] font-extrabold
                      leading-tight tracking-tight
                      text-emerald-950
                    ">
                      {appName}
                    </div>

                    <div className="
                      truncate text-[10px]
                      font-medium text-slate-500
                    ">
                      {subtitle}
                    </div>
                  </div>
                </div>

                {onBellClick && (
                  <button
                    type="button"
                    onClick={onBellClick}
                    aria-label="Open notifications"
                    className="
                      relative flex h-9 w-9 shrink-0
                      items-center justify-center
                      rounded-full border border-slate-200
                      bg-slate-50 text-slate-700
                    "
                  >
                    <Bell size={16} />

                    {unreadNotifications > 0 && (
                      <span className="
                        absolute -right-0.5 -top-0.5
                        flex h-4 min-w-4 items-center
                        justify-center rounded-full
                        bg-emerald-700 px-1
                        font-mono text-[8px] font-bold text-white
                      ">
                        {unreadNotifications > 9
                          ? '9+'
                          : unreadNotifications}
                      </span>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* SCROLLABLE CONTENT */}

            <div className={`
              min-h-0 min-w-0 flex-1
              overflow-x-hidden overflow-y-auto
              overscroll-y-contain touch-pan-y
              px-3 pt-3
              [scrollbar-width:none]
              [-ms-overflow-style:none]
              [&::-webkit-scrollbar]:hidden
              ${
                isBrowser
                  ? 'bg-[#F8FBF9] pb-14'
                  : hasTabs
                    ? 'pb-16'
                    : 'pb-4'
              }
            `}>

              {/* BROWSER APP INFORMATION */}

              {isBrowser && (
                <div className="
                  space-y-2 rounded-xl
                  border border-emerald-100
                  bg-white p-2.5 shadow-sm
                ">
                  <div className="
                    flex items-center justify-between gap-2
                  ">
                    <div className="
                      flex min-w-0 items-center gap-2
                    ">
                      <div className="
                        flex h-8 w-8 shrink-0 items-center
                        justify-center rounded-lg
                        bg-emerald-800 text-white
                      ">
                        <BusIcon />
                      </div>

                      <div className="min-w-0">
                        <div className="
                          flex items-center gap-1 truncate
                          text-xs font-extrabold text-emerald-950
                        ">
                          {appName}

                          <span className="
                            rounded border border-emerald-200
                            bg-emerald-50 px-1 py-0.5
                            font-mono text-[8px]
                            font-semibold text-emerald-700
                          ">
                            {tr('Web').toUpperCase()}
                          </span>
                        </div>

                        <div className="
                          truncate text-[10px] text-slate-500
                        ">
                          {subtitle}
                        </div>
                      </div>
                    </div>

                    {onBellClick && (
                      <button
                        type="button"
                        onClick={onBellClick}
                        aria-label="Open web notifications"
                        className="
                          relative flex h-8 w-8 shrink-0
                          items-center justify-center
                          rounded-full border border-slate-200
                          bg-slate-50 text-slate-700
                        "
                      >
                        <Bell size={15} />

                        {unreadNotifications > 0 && (
                          <span className="
                            absolute -right-0.5 -top-0.5
                            flex h-4 min-w-4 items-center
                            justify-center rounded-full
                            bg-emerald-700 px-1
                            font-mono text-[8px] font-bold text-white
                          ">
                            {unreadNotifications > 9
                              ? '9+'
                              : unreadNotifications}
                          </span>
                        )}
                      </button>
                    )}
                  </div>

                  {/* BROWSER PAGE TABS */}

                  {hasTabs && (
                    <div
                      className="
                        grid gap-1 border-t
                        border-slate-100 pt-2
                      "
                      style={{
                        gridTemplateColumns:
                          `repeat(${tabs.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;

                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => onTabChange(tab.id)}
                            className={`
                              flex min-w-0 items-center
                              justify-center gap-1
                              rounded-md px-1 py-1.5
                              text-[9px] font-semibold
                              transition-colors
                              ${
                                isActive
                                  ? 'bg-emerald-800 text-white'
                                  : 'bg-slate-50 text-slate-600 hover:bg-emerald-50'
                              }
                            `}
                          >
                            <span className="truncate">
                              {tab.label}
                            </span>

                            {tab.badgeCount ? (
                              <span className="
                                shrink-0 rounded-full
                                bg-emerald-700 px-1
                                font-mono text-[8px]
                                font-bold text-white
                              ">
                                {tab.badgeCount}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* APP SCREEN CONTENT */}

              {children}

              {/* BROWSER FOOTER */}

              {isBrowser && (
                <footer className="
                  mt-3 space-y-1 rounded-xl
                  border border-slate-200
                  bg-white px-3 py-3 text-center
                ">
                  <div className="
                    text-[11px] font-bold text-emerald-900
                  ">
                    {tr('BusBite Mobile Web')}
                  </div>

                  <p className="text-[10px] text-slate-500">
                    {tr('Bus Tickets & Highway Food Pre-Order')}
                  </p>
                </footer>
              )}
            </div>

            {/* OVERLAY */}

            {overlay}

            {/* BROWSER BOTTOM BAR */}

            {browserConfig ? (
              <div className="
                absolute bottom-0 left-0 right-0 z-50
                flex h-11 items-center justify-between
                border-t border-slate-200
                bg-white/95 px-4
                text-slate-600 backdrop-blur-md
              ">
                <button
                  type="button"
                  disabled={!browserConfig.canGoBack}
                  onClick={browserConfig.onBack}
                  aria-label="Browser back"
                  className="
                    rounded-lg p-1.5
                    hover:bg-slate-100 disabled:opacity-30
                  "
                >
                  <ChevronLeft size={18} />
                </button>

                <button
                  type="button"
                  disabled={!browserConfig.canGoForward}
                  onClick={browserConfig.onForward}
                  aria-label="Browser forward"
                  className="
                    rounded-lg p-1.5
                    hover:bg-slate-100 disabled:opacity-30
                  "
                >
                  <ChevronRight size={18} />
                </button>

                <button
                  type="button"
                  onClick={browserConfig.onSwitchToApp}
                  aria-label="Switch to native app"
                  className="
                    rounded-lg p-1.5
                    text-emerald-800 hover:bg-slate-100
                  "
                >
                  <Share size={15} />
                </button>

                <div className="
                  flex h-5 w-5 items-center justify-center
                  rounded border-[1.5px]
                  border-slate-600 font-mono
                  text-[10px] font-bold
                ">
                  1
                </div>

                <button
                  type="button"
                  onClick={onBellClick}
                  aria-label="Browser menu"
                  className="
                    rounded-lg p-1.5 hover:bg-slate-100
                  "
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>
            ) : hasTabs ? (

              /* NATIVE APP BOTTOM NAVIGATION */

              <nav
                aria-label={`${appName} navigation`}
                className="
                  absolute bottom-0 left-0 right-0 z-50
                  border-t border-slate-200/90
                  bg-white/95 px-1 pt-1.5 pb-2
                  backdrop-blur-lg
                "
              >
                <div
                  className="grid gap-1"
                  style={{
                    gridTemplateColumns:
                      `repeat(${tabs.length}, minmax(0, 1fr))`,
                  }}
                >
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => onTabChange(tab.id)}
                        className={`
                          flex min-w-0 flex-col
                          items-center justify-center
                          gap-1 rounded-lg py-1
                          text-[9px] font-bold
                          transition-colors
                          ${
                            isActive
                              ? 'text-emerald-800'
                              : 'text-slate-400 hover:text-slate-700'
                          }
                        `}
                      >
                        <span className={`
                          relative flex h-7 w-8
                          items-center justify-center
                          rounded-lg transition-colors
                          ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-800'
                              : ''
                          }
                        `}>
                          {tab.icon}

                          {tab.badgeCount ? (
                            <span className="
                              absolute -right-1 -top-1
                              flex h-3.5 min-w-3.5
                              items-center justify-center
                              rounded-full bg-emerald-700
                              px-1 font-mono text-[8px]
                              font-bold text-white
                            ">
                              {tab.badgeCount}
                            </span>
                          ) : null}
                        </span>

                        <span className="
                          max-w-full truncate px-0.5 leading-none
                        ">
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </nav>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// Small reusable Bus icon
function BusIcon() {
  return <span className="text-[13px] leading-none">🚌</span>;
}
