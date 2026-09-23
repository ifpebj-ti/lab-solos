export default function VersionDisplay() {
  const buildDate = new Date(__APP_BUILD_DATE__);
  const isContainerPlaceholder =
    __APP_VERSION__ === 'container' &&
    __APP_GIT_HASH__ === 'container' &&
    buildDate.getTime() === 0;

  if (isContainerPlaceholder) return null;

  const formattedDate = Number.isNaN(buildDate.getTime())
    ? __APP_BUILD_DATE__
    : new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'medium',
        timeZone: 'America/Sao_Paulo',
      }).format(buildDate);
  const details = `Versão ${__APP_VERSION__} · ${__APP_GIT_HASH__} · build de ${formattedDate}`;

  return (
    <div className='w-full px-3 py-2'>
      <span
        title={details}
        aria-label={details}
        className='block truncate text-xs text-sidebar-foreground/70'
      >
        v{__APP_VERSION__}
      </span>
    </div>
  );
}
