import { createTheme } from '@mui/material/styles';

// Paleta de colores del museo
const museumPalette = {
    // Morados
    purple: {
        main: '#6950A1',
        light: '#A38DC2',
        lighter: '#C1B3D8',
        dark: '#6950A1',
    },
    // Verdes
    green: {
        main: '#00B26B',
        light: '#94CA9E',
        lighter: '#BCDDC0',
        dark: '#00B26B',
    },
    // Rosas
    pink: {
        main: '#F17DB1',
        light: '#F6B7D4',
        lighter: '#F9D1E4',
        dark: '#F17DB1',
    },
    // Naranjas
    orange: {
        main: '#F37043',
        light: '#F6AA85',
        lighter: '#FAC8AE',
        dark: '#F37043',
    },
    // Grises
    gray: {
        900: '#000000',
        700: '#575756',
        500: '#878787',
        300: '#B2B2B2',
    },
};

const theme = createTheme({
    palette: {
        primary: {
            main: museumPalette.purple.main,
            light: museumPalette.purple.light,
            dark: museumPalette.purple.dark,
            contrastText: '#ffffff',
        },
        secondary: {
            main: museumPalette.pink.main,
            light: museumPalette.pink.light,
            dark: museumPalette.pink.dark,
            contrastText: '#ffffff',
        },
        success: {
            main: museumPalette.green.main,
            light: museumPalette.green.light,
            dark: museumPalette.green.dark,
            contrastText: '#ffffff',
        },
        warning: {
            main: museumPalette.orange.main,
            light: museumPalette.orange.light,
            dark: museumPalette.orange.dark,
            contrastText: '#ffffff',
        },
        error: {
            main: '#ef4444',
            light: '#fca5a5',
            dark: '#dc2626',
            contrastText: '#ffffff',
        },
        text: {
            primary: museumPalette.gray[900],
            secondary: museumPalette.gray[700],
            disabled: museumPalette.gray[500],
        },
        background: {
            default: '#f5f5f5',
            paper: '#ffffff',
        },
        divider: museumPalette.gray[300],
    },
    typography: {
        fontFamily: [
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
        ].join(','),
        h1: {
            fontWeight: 600,
        },
        h2: {
            fontWeight: 600,
        },
        h3: {
            fontWeight: 600,
        },
        button: {
            textTransform: 'none', // No uppercase automático
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 12, // Bordes más redondeados
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    padding: '10px 24px',
                    fontSize: '1rem',
                },
                contained: {
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    '&:hover': {
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 12,
                    },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                },
            },
        },
    },
});

export default theme;
