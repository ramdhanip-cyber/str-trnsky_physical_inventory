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
  DialogTitle,
  InputAdornment,
  IconButton,
  Divider,
  Fade,
  useTheme,
  useMediaQuery,
  Chip,
  Avatar,
  Card,
  CardContent
} from '@mui/material';
import { 
  useNavigate 
} from 'react-router-dom';
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
  Security,
  VerifiedUser,
  Inventory,
  TrendingUp,
  CheckCircle
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginPageProps {
  onLogin: () => void;
}

interface FormErrors {
  user_name: string;
  password: string;
}

// Enhanced styled components
const LoginContainer = styled(Container)(() => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
    animation: 'float 20s ease-in-out infinite',
  },
  '@keyframes float': {
    '0%, 100%': { transform: 'translateY(0px)' },
    '50%': { transform: 'translateY(-20px)' },
  }
}));

const LoginCard = styled(Card)(() => ({
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(20px)',
  borderRadius: '32px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  overflow: 'hidden',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb, #f5576c)',
    backgroundSize: '400% 400%',
    animation: 'gradientShift 3s ease infinite',
  },
  '@keyframes gradientShift': {
    '0%, 100%': { backgroundPosition: '0% 50%' },
    '50%': { backgroundPosition: '100% 50%' },
  }
}));

const StyledTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '& fieldset': {
      borderColor: 'rgba(102, 126, 234, 0.2)',
      borderWidth: '2px',
      transition: 'all 0.3s ease',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(102, 126, 234, 0.4)',
      borderWidth: '2px',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#667eea',
      borderWidth: '2px',
    }
  },
  '& .MuiInputLabel-root': {
    color: '#666',
    fontWeight: 500,
    '&.Mui-focused': {
      color: '#667eea',
      fontWeight: 600,
    }
  },
  '& .MuiInputBase-input': {
    color: '#333',
    fontWeight: 500,
    padding: '18px 16px',
  },
  '& .MuiInputAdornment-root': {
    color: '#667eea',
  }
}));

const LoginButton = styled(Button)(() => ({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: '20px',
  padding: '16px 32px',
  fontSize: '1.1rem',
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 12px 35px rgba(102, 126, 234, 0.4)',
    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
  },
  '&:active': {
    transform: 'translateY(-1px)',
  }
}));

const RoleCard = styled(Card)(() => ({
  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
  borderRadius: '20px',
  border: '2px solid transparent',
  backgroundClip: 'padding-box',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-8px) scale(1.02)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
    borderColor: '#667eea',
  }
}));

const FloatingIcon = styled(Box)(() => ({
  position: 'absolute',
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: 'float 6s ease-in-out infinite',
  '&:nth-of-type(1)': {
    top: '10%',
    left: '10%',
    animationDelay: '0s',
  },
  '&:nth-of-type(2)': {
    top: '20%',
    right: '15%',
    animationDelay: '2s',
  },
  '&:nth-of-type(3)': {
    bottom: '15%',
    left: '20%',
    animationDelay: '4s',
  },
  '@keyframes float': {
    '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
    '50%': { transform: 'translateY(-20px) rotate(180deg)' },
  }
}));

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

  // Auto-hide error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const validateForm = () => {
    const errors: FormErrors = {
      user_name: '',
      password: ''
    };
    if (!user_name) errors.user_name = 'Username is required';
    if (!password) errors.password = 'Password is required';
    setFormErrors(errors);
    return Object.keys(errors).every(key => !errors[key as keyof FormErrors]);
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

  const handleRoleSelection = (role: string) => {
    setOpenRoleDialog(false);
    localStorage.setItem('Selected Role', role);
    onLogin();
    
    switch(role) {
      case 'Controller':
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

  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'Controller':
        return <CorporateFare sx={{ fontSize: 32, color: '#667eea' }} />;
      case 'Counter':
        return <PointOfSale sx={{ fontSize: 32, color: '#764ba2' }} />;
      case 'Checker':
        return <FactCheck sx={{ fontSize: 32, color: '#f093fb' }} />;
      default:
        return <AccountCircle sx={{ fontSize: 32, color: '#667eea' }} />;
    }
  };

  const getRoleDescription = (role: string) => {
    switch(role) {
      case 'Controller':
        return 'Full administrative access with oversight capabilities';
      case 'Counter':
        return 'Process transactions and manage inventory counts';
      case 'Checker':
        return 'Verify and approve inventory transactions';
      default:
        return 'Standard user access';
    }
  };

  const getRoleFeatures = (role: string) => {
    switch(role) {
      case 'Controller':
        return ['Dashboard Analytics', 'User Management', 'System Reports', 'Full Access'];
      case 'Counter':
        return ['Inventory Counting', 'Transaction Processing', 'Real-time Updates', 'Team Management'];
      case 'Checker':
        return ['Transaction Verification', 'Quality Control', 'Approval Workflow', 'Audit Trail'];
      default:
        return ['Basic Access', 'View Reports', 'Limited Actions'];
    }
  };

  return (
    <LoginContainer maxWidth={false}>
      {/* Floating Background Icons */}
      <FloatingIcon>
        <Security sx={{ color: 'rgba(102, 126, 234, 0.6)' }} />
      </FloatingIcon>
      <FloatingIcon>
        <VerifiedUser sx={{ color: 'rgba(118, 75, 162, 0.6)' }} />
      </FloatingIcon>
      <FloatingIcon>
        <CheckCircle sx={{ color: 'rgba(240, 147, 251, 0.6)' }} />
      </FloatingIcon>

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ 
            duration: 0.8,
            type: "spring",
            stiffness: 100,
            damping: 20
          }}
          style={{ width: '100%', maxWidth: '500px' }}
        >
          <LoginCard>
            <CardContent sx={{ p: 4 }}>
              {/* Header Section */}
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <motion.div
                  animate={{ 
                    rotate: [0, -5, 5, -5, 0],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      mx: 'auto',
                      mb: 2,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
                    }}
                  >
                    <LockOutlined sx={{ fontSize: 40 }} />
                  </Avatar>
                </motion.div>
                
                <Typography 
                  variant="h3" 
                  fontWeight="bold" 
                  gutterBottom
                  sx={{
                    fontSize: isMobile ? '2rem' : '2.5rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 1
                  }}
                >
                  Welcome Back
                </Typography>
                
                <Typography 
                  variant="body1"
                  sx={{
                    color: '#666',
                    fontSize: isMobile ? '0.95rem' : '1.1rem',
                    fontWeight: 500
                  }}
                >
                  Sign in to access your inventory management system
                </Typography>

                {/* Feature Highlights */}
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                  <Chip 
                    icon={<TrendingUp />} 
                    label="Real-time Analytics" 
                    size="small" 
                    sx={{ 
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                      color: '#667eea',
                      fontWeight: 500
                    }} 
                  />
                  <Chip 
                    icon={<Security />} 
                    label="Secure Access" 
                    size="small" 
                    sx={{ 
                      background: 'linear-gradient(135deg, rgba(240, 147, 251, 0.1) 0%, rgba(245, 87, 108, 0.1) 100%)',
                      color: '#f093fb',
                      fontWeight: 500
                    }} 
                  />
                  <Chip 
                    icon={<Inventory />} 
                    label="Smart Inventory" 
                    size="small" 
                    sx={{ 
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                      color: '#667eea',
                      fontWeight: 500
                    }} 
                  />
                </Box>
              </Box>

              {/* Error Alert */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Alert 
                      severity="error" 
                      sx={{ 
                        mb: 3,
                        borderRadius: '16px',
                        backgroundColor: 'rgba(244, 67, 54, 0.1)',
                        border: '1px solid rgba(244, 67, 54, 0.2)',
                        '& .MuiAlert-icon': {
                          color: '#f44336'
                        }
                      }}
                    >
                      {error}
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Login Form */}
              <form onSubmit={handleLogin}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <StyledTextField
                    label="Username"
                    fullWidth
                    margin="normal"
                    value={user_name}
                    onChange={(e) => {
                      setUserName(e.target.value);
                    }}
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
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <StyledTextField
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    fullWidth
                    margin="normal"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                    }}
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
                              color: '#667eea',
                              '&:hover': {
                                color: '#764ba2',
                                background: 'rgba(102, 126, 234, 0.1)'
                              }
                            }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </motion.div>

                <Box sx={{ 
                  textAlign: 'right', 
                  mt: 1,
                  mb: 2
                }}>
                  <Button 
                    size="small" 
                    sx={{ 
                      color: '#667eea',
                      fontWeight: 500,
                      '&:hover': {
                        color: '#764ba2',
                        background: 'rgba(102, 126, 234, 0.1)'
                      }
                    }}
                  >
                    Forgot Password?
                  </Button>
                </Box>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <LoginButton
                    type="submit"
                    fullWidth
                    size="large"
                    endIcon={!loading && <ArrowForward />}
                    disabled={loading}
                  >
                    {loading ? (
                      <CircularProgress 
                        size={24} 
                        color="inherit" 
                        sx={{ my: 0.5 }}
                      /> 
                    ) : (
                      'Sign In'
                    )}
                  </LoginButton>
                </motion.div>
              </form>

              <Divider 
                sx={{ 
                  my: 4, 
                  bgcolor: 'rgba(102, 126, 234, 0.2)',
                  '&::before, &::after': {
                    borderColor: 'rgba(102, 126, 234, 0.2)',
                  }
                }} 
              />

              <Box sx={{ textAlign: 'center' }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#666',
                    fontSize: '0.95rem',
                    fontWeight: 500
                  }}
                >
                  Don't have an account?{' '}
                  <Button 
                    size="small" 
                    sx={{ 
                      color: '#667eea',
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        color: '#764ba2',
                        background: 'rgba(102, 126, 234, 0.1)'
                      }
                    }}
                  >
                    Request Access
                  </Button>
                </Typography>
              </Box>
            </CardContent>
          </LoginCard>
        </motion.div>
      </AnimatePresence>

      {/* Enhanced Role Selection Dialog */}
      <Dialog 
        open={openRoleDialog} 
        onClose={() => setOpenRoleDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }
        }}
        TransitionComponent={Fade}
        transitionDuration={400}
      >
        <DialogTitle 
          sx={{ 
            textAlign: 'center', 
            fontWeight: 'bold',
            fontSize: '1.8rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            pb: 1
          }}
        >
          Choose Your Role
        </DialogTitle>
        <DialogContent>
          <Typography 
            variant="body1" 
            textAlign="center" 
            color="text.secondary" 
            gutterBottom
            sx={{ mb: 4, fontSize: '1.1rem', fontWeight: 500 }}
          >
            You have access to multiple roles. Select the one you'd like to use for this session.
          </Typography>
          
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 3
          }}>
            {roleDesc.length > 0 ? (
              roleDesc.map((role, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.2 }}
                >
                  <RoleCard
                    onClick={() => handleRoleSelection(role)}
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb)',
                        backgroundSize: '200% 200%',
                        animation: 'gradientShift 2s ease infinite',
                      }
                    }}
                  >
                    <Box sx={{ mb: 2 }}>
                      {getRoleIcon(role)}
                    </Box>
                    
                    <Typography 
                      variant="h6"
                      fontWeight="bold"
                      sx={{ 
                        color: '#333',
                        mb: 1
                      }}
                    >
                      {role}
                    </Typography>
                    
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#666',
                        mb: 3,
                        lineHeight: 1.6
                      }}
                    >
                      {getRoleDescription(role)}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {getRoleFeatures(role).map((feature, featureIndex) => (
                        <Box 
                          key={featureIndex}
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            justifyContent: 'center'
                          }}
                        >
                          <CheckCircle sx={{ fontSize: 16, color: '#667eea' }} />
                          <Typography variant="caption" sx={{ color: '#666', fontWeight: 500 }}>
                            {feature}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </RoleCard>
                </motion.div>
              ))
            ) : (
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ py: 3, textAlign: 'center' }}
              >
                No roles available
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions 
          sx={{ 
            justifyContent: 'center', 
            pb: 3,
            pt: 2
          }}
        >
          <Button 
            onClick={() => setOpenRoleDialog(false)} 
            color="primary"
            variant="outlined"
            sx={{ 
              borderRadius: '16px',
              px: 4,
              py: 1.5,
              fontWeight: 600,
              borderColor: '#667eea',
              color: '#667eea',
              '&:hover': {
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderColor: '#764ba2',
                color: '#764ba2'
              }
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