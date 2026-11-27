import type { HighwayRoute, Restaurant, Trip } from '../types/platform';
import { useLanguage } from '../i18n/indianLanguages';

interface RouteMapVisualizerProps {
  route: HighwayRoute;
  trip?: Trip;
  restaurants: Restaurant[];
  highlightedRestaurantId?: string;
  onSelectRestaurant?: (restaurantId: string) => void;
  compact?: boolean;
  mobileLayout?: boolean;
}

export function RouteMapVisualizer({
  route,
  trip,
  restaurants,
  highlightedRestaurantId,
  onSelectRestaurant,
  compact = false,
  mobileLayout = false,
}: RouteMapVisualizerProps) {
  const { tr, td } = useLanguage();
  const width = mobileLayout ? 288 : 760;
  const height = mobileLayout ? 132 : compact ? 168 : 220;
  const padX = mobileLayout ? 22 : 56;
  const lineY = mobileLayout ? 64 : compact ? 74 : 96;
  const spanX = width - padX * 2;
  const totalKm = Math.max(1, route.totalKm);

  const progressRatio = trip ? Math.max(0, Math.min(1, trip.progressPct / 100)) : 0;
  const busX = padX + progressRatio * spanX;

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-3">
      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 min-w-0">
          <span className="font-semibold text-slate-900 truncate">{td(route.name)}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums shrink-0">{tr(`${route.totalKm} km`)}</span>
        </div>
        {trip && (
          <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono tabular-nums">
            <span>{tr(`${trip.currentKm} km`)}</span>
            <span aria-hidden="true">·</span>
            <span>{tr(`${trip.speedKmh} km/h`)}</span>
            {!mobileLayout && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {trip.currentLat.toFixed(4)}°N, {trip.currentLng.toFixed(4)}°E
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <div
        className={
          mobileLayout
            ? 'w-full overflow-hidden'
            : 'w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        }
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className={
            mobileLayout
              ? 'w-full h-auto select-none'
              : 'w-full min-w-[440px] md:min-w-0 h-auto select-none'
          }
          role="img"
          aria-label={`Live corridor map for ${route.name}`}
        >
          <defs>
            <pattern
              id={`grid-${route.id}-${mobileLayout ? 'm' : 'd'}`}
              width="28"
              height="28"
              patternUnits="userSpaceOnUse"
            >
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#F1F5F9" strokeWidth="1" />
            </pattern>
          </defs>
          <rect
            x="0"
            y="0"
            width={width}
            height={height}
            rx="8"
            fill={`url(#grid-${route.id}-${mobileLayout ? 'm' : 'd'})`}
          />

          {/* Base highway corridor track */}
          <line
            x1={padX}
            y1={lineY}
            x2={padX + spanX}
            y2={lineY}
            stroke="#CBD5E1"
            strokeWidth={mobileLayout ? '5' : '6'}
            strokeLinecap="round"
          />

          {/* Completed progress track */}
          {trip && (
            <line
              x1={padX}
              y1={lineY}
              x2={busX}
              y2={lineY}
              stroke="#059669"
              strokeWidth={mobileLayout ? '5' : '6'}
              strokeLinecap="round"
              style={{ transition: 'all 350ms cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
          )}

          {/* Stops & Partner Restaurants */}
          {route.stops.map((stop, index) => {
            const x = padX + (stop.kmFromOrigin / totalKm) * spanX;
            const rest = stop.restaurantId
              ? restaurants.find((r) => r.id === stop.restaurantId)
              : undefined;
            const stopEta = trip?.stopEtas.find((s) => s.stopId === stop.id);
            const isHighlighted =
              highlightedRestaurantId && stop.restaurantId === highlightedRestaurantId;
            const isPassed = stopEta?.passed;
            const labelTop = index % 2 === 0;
            const interactive = Boolean(rest && onSelectRestaurant);

            const shortLabel = rest
              ? mobileLayout
                ? td(rest.city)
                : td(rest.name)
              : td(stop.name.split(' ')[0]);

            return (
              <g
                key={stop.id}
                onClick={() => {
                  if (rest && onSelectRestaurant) onSelectRestaurant(rest.id);
                }}
                className={interactive ? 'cursor-pointer' : undefined}
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                onKeyDown={(e) => {
                  if (interactive && rest && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onSelectRestaurant?.(rest.id);
                  }
                }}
              >
                <line
                  x1={x}
                  y1={lineY}
                  x2={x}
                  y2={labelTop ? lineY - 22 : lineY + 22}
                  stroke={isHighlighted ? '#059669' : '#94A3B8'}
                  strokeWidth={isHighlighted ? '2' : '1.2'}
                  strokeDasharray={rest ? undefined : '2 2'}
                />

                {isHighlighted && rest && (
                  <circle cx={x} cy={lineY} r="12" fill="#10B981" fillOpacity="0.22" />
                )}

                <circle
                  cx={x}
                  cy={lineY}
                  r={rest ? (mobileLayout ? 6.5 : 8) : mobileLayout ? 4.5 : 6}
                  fill={
                    isPassed ? '#064E3B' : rest ? (isHighlighted ? '#047857' : '#FFFFFF') : '#F8FAFC'
                  }
                  stroke={isPassed ? '#064E3B' : rest ? '#059669' : '#64748B'}
                  strokeWidth="2.2"
                />

                <text
                  x={x}
                  y={labelTop ? lineY - 35 : lineY + 35}
                  textAnchor="middle"
                  className={`${mobileLayout ? 'text-[9px]' : 'text-[11px]'} font-semibold ${
                    isHighlighted ? 'fill-emerald-800' : 'fill-slate-900'
                  }`}
                >
                  {shortLabel}
                </text>
                <text
                  x={x}
                  y={labelTop ? lineY - 24 : lineY + 46}
                  textAnchor="middle"
                  className={`${mobileLayout ? 'text-[8px]' : 'text-[10px]'} fill-slate-500 font-mono`}
                >
                  {stopEta && !stopEta.passed && stop.kmFromOrigin > 0
                    ? tr(`${stopEta.etaMinutes}m`)
                    : `${stop.kmFromOrigin}k`}
                </text>
              </g>
            );
          })}

          {/* Active Bus Marker */}
          {trip && (
            <g
              transform={`translate(${busX}, ${lineY})`}
              style={{ transition: 'transform 350ms cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
              <circle r={mobileLayout ? '12' : '15'} fill="#10B981" fillOpacity="0.22" />
              <rect
                x={mobileLayout ? '-11' : '-13'}
                y={mobileLayout ? '-8' : '-9'}
                width={mobileLayout ? '22' : '26'}
                height={mobileLayout ? '16' : '18'}
                rx="4"
                fill="#064E3B"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              <text
                x="0"
                y="3"
                textAnchor="middle"
                className="text-[7px] font-bold fill-white font-mono"
              >
                BUS
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
