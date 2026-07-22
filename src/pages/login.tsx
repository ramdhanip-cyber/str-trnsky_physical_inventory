import React, { useState, useEffect } from 'react';
import { authAPI } from '../config/api';
import {
  TextField,
  Button,
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  InputAdornment,
  IconButton,
  Fade,
  useTheme,
  useMediaQuery,
  Chip,
  Avatar,
  Paper,
  alpha,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  LockOutlined,
  PersonOutline,
  Visibility,
  VisibilityOff,
  CorporateFare,
  AccountCircle,
  PointOfSale,
  FactCheck,
  ArrowForward,
  Inventory2Outlined,
  Security,
  CheckCircle,
} from '@mui/icons-material';
import { styled, keyframes } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';

const BRAND_GRADIENT = 'linear-gradient(135deg, #0C2C48 0%, #1E5A8A 100%)';
const NAVY = '#0C2C48';
const NAVY_MID = '#1E5A8A';

const floatOrb = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(18px, -24px) scale(1.05); }
  66% { transform: translate(-14px, 12px) scale(0.96); }
`;

const shimmer = keyframes`
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

const softPulse = keyframes`
  0%, 100% { box-shadow: 0 10px 28px rgba(12, 44, 72, 0.35); transform: scale(1); }
  50% { box-shadow: 0 14px 36px rgba(30, 90, 138, 0.45); transform: scale(1.04); }
`;

interface LoginPageProps {
  onLogin: () => void;
}

interface FormErrors {
  user_name: string;
  password: string;
}

const LoginContainer = styled(Container)(() => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: BRAND_GRADIENT,
  position: 'relative',
  overflow: 'hidden',
}));

const LoginCard = styled(Paper)(() => ({
  background: '#ffffff',
  borderRadius: '24px',
  boxShadow: '0 24px 60px rgba(12, 44, 72, 0.35)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  overflow: 'hidden',
  position: 'relative',
  zIndex: 1,
}));

const AccentStrip = styled(Box)(() => ({
  height: 5,
  background: 'linear-gradient(90deg, #0C2C48, #1E5A8A, #4a9fd8, #1E5A8A, #0C2C48)',
  backgroundSize: '200% 100%',
  animation: `${shimmer} 4s linear infinite`,
}));

const FloatingOrb = styled(Box)<{ size: number; top?: string; left?: string; right?: string; bottom?: string; delay?: string }>(
  ({ size, top, left, right, bottom, delay }) => ({
    position: 'absolute',
    width: size,
    height: size,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
    top,
    left,
    right,
    bottom,
    animation: `${floatOrb} 12s ease-in-out infinite`,
    animationDelay: delay || '0s',
    pointerEvents: 'none',
    zIndex: 0,
  })
);

const cardVariants = {
  hidden: { opacity: 0, y: 48, scale: 0.94 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 90, damping: 16, mass: 0.8 },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.25 },
  },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const roleCardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: 0.1 + i * 0.12, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const StyledTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    backgroundColor: '#f8fafc',
    transition: 'all 0.2s ease',
    '& fieldset': {
      borderColor: 'rgba(12, 44, 72, 0.12)',
      borderWidth: '1.5px',
    },
    '&:hover fieldset': {
      borderColor: alpha(NAVY_MID, 0.45),
    },
    '&.Mui-focused fieldset': {
      borderColor: NAVY_MID,
      borderWidth: '2px',
    },
  },
  '& .MuiInputLabel-root': {
    color: '#64748b',
    fontWeight: 500,
    '&.Mui-focused': {
      color: NAVY,
      fontWeight: 600,
    },
  },
  '& .MuiInputBase-input': {
    color: NAVY,
    fontWeight: 500,
    padding: '16px 14px',
  },
  '& .MuiInputAdornment-root': {
    color: NAVY_MID,
  },
}));

const ROLE_META: Record<
  string,
  { icon: React.ReactNode; description: string; features: string[]; accent: string }
> = {
  Reconciler: {
    icon: <CorporateFare sx={{ fontSize: 28 }} />,
    description: 'Full administrative access with oversight capabilities',
    features: ['Dashboard Analytics', 'User Management', 'System Reports'],
    accent: BRAND_GRADIENT,
  },
  Counter: {
    icon: <PointOfSale sx={{ fontSize: 28 }} />,
    description: 'Process transactions and manage inventory counts',
    features: ['Inventory Counting', 'Transaction Processing', 'Real-time Updates'],
    accent: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  },
  Checker: {
    icon: <FactCheck sx={{ fontSize: 28 }} />,
    description: 'Verify and approve inventory transactions',
    features: ['Transaction Verification', 'Quality Control', 'Approval Workflow'],
    accent: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)',
  },
};

const Login: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [user_name, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({ user_name: '', password: '' });
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [roleDesc, setRoleDesc] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const validateForm = () => {
    const errors: FormErrors = {
      user_name: '',
      password: '',
    };
    if (!user_name) errors.user_name = 'Username is required';
    if (!password) errors.password = 'Password is required';
    setFormErrors(errors);
    return Object.keys(errors).every((key) => !errors[key as keyof FormErrors]);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const res = await authAPI.login(user_name, password);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('full_name', res.data.full_name);
      localStorage.setItem('User ID', res.data.user_id);
      localStorage.setItem('User Roles', res.data.roleDesc.join(', '));

      setRoleDesc(res.data.roleDesc);
      setOpenRoleDialog(true);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        setError(axiosError.response?.data?.error || 'Invalid username or password');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const navigateForRole = (role: string) => {
    localStorage.setItem('Selected Role', role);
    onLogin();
    switch (role) {
      case 'Reconciler':
        navigate('/dashboard');
        break;
      case 'Counter':
        navigate('/counter');
        break;
      case 'Checker':
        navigate('/checker');
        break;
      default:
        navigate('/');
    }
  };

  const handleRoleSelection = (role: string) => {
    setOpenRoleDialog(false);
    navigateForRole(role);
  };

  const orderedRoles = [...roleDesc].sort((a, b) => {
    const rolePriority: Record<string, number> = {
      Reconciler: 1,
      Counter: 2,
      Checker: 3,
    };
    const aPriority = rolePriority[a] ?? 99;
    const bPriority = rolePriority[b] ?? 99;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.localeCompare(b);
  });

  const getRoleMeta = (role: string) =>
    ROLE_META[role] || {
      icon: <AccountCircle sx={{ fontSize: 28 }} />,
      description: 'Standard user access',
      features: ['Basic Access', 'View Reports'],
      accent: BRAND_GRADIENT,
    };

  return (
    <LoginContainer maxWidth={false}>
      {/* Ambient floating orbs */}
      <FloatingOrb size={420} top="-120px" right="-80px" delay="0s" />
      <FloatingOrb size={320} bottom="-100px" left="-90px" delay="2s" />
      <FloatingOrb size={180} top="18%" left="12%" delay="4s" sx={{ background: 'rgba(255,255,255,0.05)' }} />
      <FloatingOrb size={120} bottom="22%" right="14%" delay="1.5s" sx={{ background: 'rgba(255,255,255,0.06)' }} />

      <Box sx={{ width: '100%', maxWidth: 440, px: 2, position: 'relative', zIndex: 1 }}>
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <LoginCard elevation={0}>
            <AccentStrip />

            <Box
              component={motion.div}
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              sx={{ p: { xs: 3, sm: 4 } }}
            >
              {/* Brand header */}
              <Box
                component={motion.div}
                variants={fadeUpItem}
                sx={{ textAlign: 'center', mb: 3.5 }}
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Avatar
                    sx={{
                      width: 72,
                      height: 72,
                      mx: 'auto',
                      mb: 2,
                      background: BRAND_GRADIENT,
                      animation: `${softPulse} 3.2s ease-in-out infinite`,
                    }}
                  >
                    <Inventory2Outlined sx={{ fontSize: 36 }} />
                  </Avatar>
                </motion.div>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      color: NAVY,
                      letterSpacing: '-0.5px',
                      fontSize: isMobile ? '1.75rem' : '2rem',
                    }}
                  >
                    Star Inventory
                  </Typography>
                  <Chip
                    label="SANDBOX"
                    size="small"
                    sx={(t) => ({
                      borderRadius: 1.5,
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      backgroundColor: alpha(t.palette.warning.main, 0.15),
                      color: t.palette.warning.dark,
                      border: `1px solid ${alpha(t.palette.warning.main, 0.3)}`,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      height: '24px',
                    })}
                  />
                </Box>

                <Typography
                  variant="body2"
                  sx={{ color: '#64748b', fontWeight: 500, mb: 2 }}
                >
                  by Star Software · Sign in to manage physical inventory
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.55, type: 'spring', stiffness: 200 }}
                  >
                    <Chip
                      icon={<Security sx={{ fontSize: '16px !important' }} />}
                      label="Secure Access"
                      size="small"
                      sx={{
                        bgcolor: alpha(NAVY, 0.06),
                        color: NAVY,
                        fontWeight: 600,
                        borderRadius: '8px',
                        '& .MuiChip-icon': { color: NAVY_MID },
                      }}
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.65, type: 'spring', stiffness: 200 }}
                  >
                    <Chip
                      icon={<CheckCircle sx={{ fontSize: '16px !important' }} />}
                      label="Role-based"
                      size="small"
                      sx={{
                        bgcolor: alpha(NAVY_MID, 0.08),
                        color: NAVY_MID,
                        fontWeight: 600,
                        borderRadius: '8px',
                        '& .MuiChip-icon': { color: NAVY_MID },
                      }}
                    />
                  </motion.div>
                </Box>
              </Box>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    key="login-error"
                    initial={{ opacity: 0, y: -12, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ duration: 0.28 }}
                  >
                    <Alert
                      severity="error"
                      sx={{
                        mb: 2.5,
                        borderRadius: '12px',
                        border: '1px solid rgba(244, 67, 54, 0.2)',
                      }}
                    >
                      {error}
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <Box
                component="form"
                onSubmit={handleLogin}
              >
                <Box component={motion.div} variants={fadeUpItem}>
                  <StyledTextField
                    label="Username"
                    fullWidth
                    margin="normal"
                    value={user_name}
                    onChange={(e) => setUserName(e.target.value)}
                    error={!!formErrors.user_name}
                    helperText={formErrors.user_name}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutline />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <Box component={motion.div} variants={fadeUpItem}>
                  <StyledTextField
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    fullWidth
                    margin="normal"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={!!formErrors.password}
                    helperText={formErrors.password}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlined />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            sx={{
                              color: NAVY_MID,
                              '&:hover': { bgcolor: alpha(NAVY, 0.06) },
                            }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <Box component={motion.div} variants={fadeUpItem}>
                  <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}>
                    <Button
                      type="submit"
                      fullWidth
                      size="large"
                      endIcon={
                        !loading && (
                          <motion.span
                            animate={{ x: [0, 4, 0] }}
                            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                            style={{ display: 'inline-flex' }}
                          >
                            <ArrowForward />
                          </motion.span>
                        )
                      }
                      disabled={loading}
                      sx={{
                        mt: 3,
                        mb: 1,
                        py: 1.5,
                        borderRadius: '12px',
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '1.05rem',
                        background: BRAND_GRADIENT,
                        boxShadow: '0 8px 24px rgba(12, 44, 72, 0.35)',
                        color: 'white',
                        '&:hover': {
                          background: BRAND_GRADIENT,
                          boxShadow: '0 12px 30px rgba(12, 44, 72, 0.45)',
                        },
                        '&.Mui-disabled': {
                          background: alpha(NAVY, 0.35),
                          color: 'rgba(255,255,255,0.7)',
                        },
                      }}
                    >
                      {loading ? (
                        <CircularProgress size={24} color="inherit" sx={{ my: 0.5 }} />
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </motion.div>
                </Box>
              </Box>

              <Typography
                component={motion.p}
                variants={fadeUpItem}
                variant="caption"
                sx={{
                  display: 'block',
                  textAlign: 'center',
                  mt: 2.5,
                  color: '#94a3b8',
                  fontWeight: 500,
                }}
              >
                Contact your administrator if you need access
              </Typography>
            </Box>
          </LoginCard>
        </motion.div>
      </Box>

      {/* Choose Your Role Dialog */}
      <Dialog
        open={openRoleDialog}
        onClose={() => setOpenRoleDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(12, 44, 72, 0.35)',
          },
        }}
        TransitionComponent={Fade}
        transitionDuration={300}
      >
        <Box
          sx={{
            background: BRAND_GRADIENT,
            color: 'white',
            px: 3,
            py: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Avatar
            sx={{
              bgcolor: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
            }}
          >
            <AccountCircle />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Choose Your Role
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              Select how you want to work in this session
            </Typography>
          </Box>
        </Box>

        <DialogContent sx={{ pt: 3, pb: 1, px: { xs: 2, sm: 3 } }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3, textAlign: 'center', fontWeight: 500 }}
          >
            You have access to multiple roles. Pick one to continue.
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 2,
            }}
          >
            {roleDesc.length > 0 ? (
              orderedRoles.map((role, index) => {
                const meta = getRoleMeta(role);
                return (
                  <motion.div
                    key={role}
                    custom={index}
                    variants={roleCardVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Paper
                      elevation={0}
                      onClick={() => handleRoleSelection(role)}
                      sx={{
                        p: 2.5,
                        borderRadius: '16px',
                        border: '1px solid rgba(0,0,0,0.06)',
                        cursor: 'pointer',
                        transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
                        position: 'relative',
                        overflow: 'hidden',
                        height: '100%',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 4,
                          background: meta.accent,
                        },
                        '&:hover': {
                          boxShadow: '0 12px 28px rgba(12, 44, 72, 0.15)',
                          borderColor: alpha(NAVY_MID, 0.35),
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                        <Avatar
                          sx={{
                            width: 48,
                            height: 48,
                            background: meta.accent,
                            boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
                          }}
                        >
                          {meta.icon}
                        </Avatar>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: NAVY }}>
                          {role}
                        </Typography>
                      </Box>

                      <Typography
                        variant="body2"
                        sx={{ color: '#64748b', mb: 2, lineHeight: 1.5 }}
                      >
                        {meta.description}
                      </Typography>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        {meta.features.map((feature) => (
                          <Box
                            key={feature}
                            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                          >
                            <CheckCircle sx={{ fontSize: 16, color: NAVY_MID }} />
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                              {feature}
                            </Typography>
                          </Box>
                        ))}
                      </Box>

                      <Button
                        fullWidth
                        endIcon={<ArrowForward />}
                        sx={{
                          mt: 2.5,
                          textTransform: 'none',
                          fontWeight: 700,
                          borderRadius: '10px',
                          background: BRAND_GRADIENT,
                          color: 'white',
                          boxShadow: 'none',
                          '&:hover': {
                            background: BRAND_GRADIENT,
                            boxShadow: '0 6px 16px rgba(12, 44, 72, 0.3)',
                          },
                        }}
                      >
                        Continue as {role}
                      </Button>
                    </Paper>
                  </motion.div>
                );
              })
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                No roles available
              </Typography>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center', px: 3, pb: 2.5, pt: 1 }}>
          <Button
            onClick={() => setOpenRoleDialog(false)}
            color="inherit"
            sx={{
              textTransform: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              px: 3,
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </LoginContainer>
  );
};

export default Login;
