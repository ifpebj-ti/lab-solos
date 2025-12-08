export default function VersionDisplay() {
    // Ajustamos a formatação para Inglês (en-US) e removemos as horas/minutos
    const formatDate = (dateString: string) => {
        try {
            return new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            }).format(new Date(dateString));
        } catch {
            return dateString;
        }
    };

    return (

        <div className="flex justify-start p-4transition-opacity ml-4">
            <span className="text-xs text-white font-mono">
                v{__APP_VERSION__} ({__APP_GIT_HASH__}, {formatDate(__APP_BUILD_DATE__)})
            </span>
        </div>
    );
}