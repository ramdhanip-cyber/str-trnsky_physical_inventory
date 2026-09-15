import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography, keyframes, alpha } from '@mui/material';
import { getDefaultRouteForRole, orderRoles, parseUserRoles } from '../config/roleUtils';
import { getRuntimeEnvironment } from '../config/runtime';

const NAVY = '#0C2C48';
const STEEL = '#1A4A6B';
const COPPER = '#B87333';
const PAPER = '#F3F0EA';
const INK = '#14212B';
const MUTED = '#5C6B76';

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const drawLine = keyframes`
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
`;

const floatIn = keyframes`
  from { opacity: 0; transform: translateX(24px) scale(0.96); }
  to   { opacity: 1; transform: translateX(0) scale(1); }
`;

const roleMeta: Record<string, { blurb: string; accent: string }> = {
  Reconciler: {
    blurb: 'Owns system comparison, approvals prep, and variance control.',
    accent: '#2F6F8F',
  },
  Gatekeeper: {
    blurb: 'Approves or rejects adjustment submissions and posts to ERP.',
    accent: '#C27A1B',
  },
  Counter: {
    blurb: 'Captures physical counts across assigned sections.',
    accent: '#3D7A5F',
  },
  Checker: {
    blurb: 'Verifies counted inventory and flags exceptions.',
    accent: COPPER,
  },
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const environment = getRuntimeEnvironment();
  const [selectedRole, setSelectedRole] = useState(
    () => localStorage.getItem('Selected Role') || ''
  );
  const [mounted, setMounted] = useState(false);

  const profile = useMemo(() => {
    const fullName = localStorage.getItem('full_name') || 'User';
    const userId = localStorage.getItem('User ID') || '—';
    const roles = orderRoles(parseUserRoles());
    const active = selectedRole || roles[0] || '—';
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const monogram =
      parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : (fullName.trim().slice(0, 2) || 'U').toUpperCase();

    return {
      fullName,
      userId,
      roles: roles.length > 0 ? roles : active !== '—' ? [active] : [],
      active,
      monogram,
    };
  }, [selectedRole]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleRoleSwitch = (role: string) => {
    if (role === selectedRole) return;
    localStorage.setItem('Selected Role', role);
    setSelectedRole(role);
    navigate(getDefaultRouteForRole(role));
    window.location.reload();
  };

  const ledgerRows = [
    { label: 'Identity', value: profile.fullName },
    { label: 'Operator ID', value: profile.userId },
    { label: 'Active seat', value: profile.active },
    { label: 'Environment', value: environment },
    { label: 'Access lanes', value: String(profile.roles.length || 1) },
  ];

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: 'calc(100vh - 48px)',
        mx: { xs: -1.5, sm: -3 },
        mt: { xs: -1.5, sm: -3 },
        mb: -3,
        px: { xs: 2, sm: 3.5, md: 5 },
        py: { xs: 3, md: 4 },
        overflow: 'hidden',
        background: `
          radial-gradient(1200px 600px at 8% -10%, ${alpha(STEEL, 0.18)}, transparent 55%),
          radial-gradient(900px 500px at 100% 0%, ${alpha(COPPER, 0.12)}, transparent 50%),
          linear-gradient(165deg, ${PAPER} 0%, #E8E4DC 48%, #DFE7EE 100%)
        `,
        fontFamily: '"Outfit", sans-serif',
        color: INK,
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(${alpha(NAVY, 0.04)} 1px, transparent 1px),
            linear-gradient(90deg, ${alpha(NAVY, 0.04)} 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at 30% 20%, #000 20%, transparent 70%)',
          pointerEvents: 'none',
        },
      }}
    >
      {/* Brand wordmark strip */}
      <Box
        sx={{
          position: 'absolute',
          left: { xs: -20, md: -10 },
          top: '18%',
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          opacity: 0.07,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <Typography
          sx={{
            fontFamily: '"Syne", sans-serif',
            fontWeight: 800,
            fontSize: { xs: '4rem', md: '6.5rem' },
            letterSpacing: '-0.04em',
            lineHeight: 0.85,
            color: NAVY,
          }}
        >
          PROFILE
        </Typography>
      </Box>

      <Box
        sx={{
          position: 'relative',
          maxWidth: 1180,
          mx: 'auto',
          opacity: mounted ? 1 : 0,
          animation: mounted ? `${fadeUp} 0.7s ease forwards` : 'none',
        }}
      >
        {/* Top identity rail */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'flex-end' }}
          spacing={2}
          sx={{ mb: { xs: 3, md: 4.5 } }}
        >
          <Box sx={{ maxWidth: 720 }}>
            <Typography
              sx={{
                fontFamily: '"Outfit", sans-serif',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: MUTED,
                mb: 1.25,
              }}
            >
              Star Inventory · Operator dossier
            </Typography>
            <Typography
              component="h1"
              sx={{
                fontFamily: '"Syne", sans-serif',
                fontWeight: 800,
                fontSize: { xs: '2.6rem', sm: '3.6rem', md: '4.4rem' },
                lineHeight: 0.95,
                letterSpacing: '-0.04em',
                color: NAVY,
                mb: 1.5,
              }}
            >
              {profile.fullName}
            </Typography>
            <Box
              sx={{
                width: 88,
                height: 3,
                bgcolor: COPPER,
                transformOrigin: 'left',
                animation: `${drawLine} 0.8s 0.25s ease forwards`,
                transform: 'scaleX(0)',
                mb: 1.5,
              }}
            />
            <Typography
              sx={{
                maxWidth: 460,
                fontSize: '1.05rem',
                fontWeight: 400,
                color: MUTED,
                lineHeight: 1.55,
              }}
            >
              Your counting authority, active seat, and access lanes — distilled into one command surface.
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1.25}
            alignItems="center"
            sx={{
              animation: mounted ? `${floatIn} 0.75s 0.15s ease both` : 'none',
            }}
          >
            <Box
              sx={{
                px: 1.5,
                py: 0.75,
                border: `1px solid ${alpha(NAVY, 0.18)}`,
                bgcolor: alpha('#fff', 0.55),
                backdropFilter: 'blur(8px)',
              }}
            >
              <Typography sx={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED, fontWeight: 600 }}>
                Runtime
              </Typography>
              <Typography sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, color: NAVY, fontSize: '0.95rem' }}>
                {environment}
              </Typography>
            </Box>
            <Box
              sx={{
                px: 1.5,
                py: 0.75,
                border: `1px solid ${alpha(COPPER, 0.35)}`,
                bgcolor: alpha(COPPER, 0.08),
              }}
            >
              <Typography sx={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED, fontWeight: 600 }}>
                Seat
              </Typography>
              <Typography sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, color: NAVY, fontSize: '0.95rem' }}>
                {profile.active}
              </Typography>
            </Box>
          </Stack>
        </Stack>

        {/* Main split composition */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1.05fr 0.95fr' },
            gap: { xs: 2.5, lg: 3.5 },
            alignItems: 'stretch',
          }}
        >
          {/* Monogram panel — visual anchor */}
          <Box
            sx={{
              position: 'relative',
              minHeight: { xs: 280, md: 420 },
              background: `linear-gradient(145deg, ${NAVY} 0%, ${STEEL} 58%, #0A2338 100%)`,
              color: '#F7F4EE',
              overflow: 'hidden',
              animation: mounted ? `${fadeUp} 0.8s 0.1s ease both` : 'none',
              '&::after': {
                content: '""',
                position: 'absolute',
                inset: 0,
                background: `
                  linear-gradient(135deg, transparent 40%, ${alpha(COPPER, 0.18)} 100%),
                  repeating-linear-gradient(
                    -18deg,
                    transparent,
                    transparent 18px,
                    ${alpha('#fff', 0.03)} 18px,
                    ${alpha('#fff', 0.03)} 19px
                  )
                `,
                pointerEvents: 'none',
              },
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1, p: { xs: 2.5, md: 3.5 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Typography
                  sx={{
                    fontSize: 11,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    opacity: 0.65,
                    fontWeight: 600,
                  }}
                >
                  Credential mark
                </Typography>
                <Typography
                  sx={{
                    fontFamily: '"Syne", sans-serif',
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: alpha(COPPER, 0.95),
                  }}
                >
                  #{profile.userId}
                </Typography>
              </Stack>

              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
                <Typography
                  sx={{
                    fontFamily: '"Syne", sans-serif',
                    fontWeight: 800,
                    fontSize: { xs: '7.5rem', sm: '9rem', md: '10.5rem' },
                    lineHeight: 0.8,
                    letterSpacing: '-0.06em',
                    background: `linear-gradient(180deg, #fff 10%, ${alpha('#fff', 0.55)} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    userSelect: 'none',
                  }}
                >
                  {profile.monogram}
                </Typography>
              </Box>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                spacing={1.5}
                sx={{
                  pt: 2,
                  borderTop: `1px solid ${alpha('#fff', 0.14)}`,
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.55, mb: 0.35 }}>
                    Signed in as
                  </Typography>
                  <Typography sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: '1.15rem' }}>
                    {profile.fullName}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: { sm: 'right' } }}>
                  <Typography sx={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.55, mb: 0.35 }}>
                    Counting authority
                  </Typography>
                  <Typography sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: '1.15rem', color: alpha(COPPER, 0.95) }}>
                    {profile.active}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Box>

          {/* Ledger + roles */}
          <Stack spacing={2.5} sx={{ animation: mounted ? `${fadeUp} 0.8s 0.2s ease both` : 'none' }}>
            <Box
              sx={{
                bgcolor: alpha('#fff', 0.72),
                border: `1px solid ${alpha(NAVY, 0.1)}`,
                backdropFilter: 'blur(10px)',
                p: { xs: 2, md: 2.5 },
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  letterSpacing: '0.04em',
                  color: NAVY,
                  mb: 1.75,
                }}
              >
                Account ledger
              </Typography>

              <Stack divider={<Box sx={{ borderBottom: `1px solid ${alpha(NAVY, 0.08)}` }} />}>
                {ledgerRows.map((row, index) => (
                  <Stack
                    key={row.label}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="baseline"
                    sx={{
                      py: 1.35,
                      gap: 2,
                      animation: mounted ? `${fadeUp} 0.55s ${0.28 + index * 0.06}s ease both` : 'none',
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: MUTED,
                        flexShrink: 0,
                      }}
                    >
                      {row.label}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: '"Syne", sans-serif',
                        fontWeight: 700,
                        fontSize: { xs: '1rem', sm: '1.15rem' },
                        color: NAVY,
                        textAlign: 'right',
                        wordBreak: 'break-word',
                      }}
                    >
                      {row.value}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>

            <Box
              sx={{
                bgcolor: alpha('#fff', 0.72),
                border: `1px solid ${alpha(NAVY, 0.1)}`,
                backdropFilter: 'blur(10px)',
                p: { xs: 2, md: 2.5 },
                flex: 1,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.75 }}>
                <Typography
                  sx={{
                    fontFamily: '"Syne", sans-serif',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    letterSpacing: '0.04em',
                    color: NAVY,
                  }}
                >
                  Access lanes
                </Typography>
                <Typography sx={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>
                  Tap a role to switch
                </Typography>
              </Stack>

              <Stack spacing={1}>
                {profile.roles.length === 0 && (
                  <Typography sx={{ color: MUTED, fontSize: '0.95rem' }}>No roles assigned.</Typography>
                )}
                {profile.roles.map((role, index) => {
                  const active = role === profile.active;
                  const meta = roleMeta[role] || {
                    blurb: 'Assigned operational access for this account.',
                    accent: STEEL,
                  };
                  return (
                    <Box
                      key={role}
                      component="button"
                      type="button"
                      onClick={() => handleRoleSwitch(role)}
                      sx={{
                        all: 'unset',
                        cursor: profile.roles.length > 1 ? 'pointer' : 'default',
                        display: 'block',
                        width: '100%',
                        boxSizing: 'border-box',
                        p: 1.5,
                        pl: 1.75,
                        borderLeft: `3px solid ${active ? meta.accent : alpha(NAVY, 0.12)}`,
                        bgcolor: active ? alpha(meta.accent, 0.08) : alpha(NAVY, 0.02),
                        transition: 'background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
                        animation: mounted ? `${fadeUp} 0.55s ${0.4 + index * 0.08}s ease both` : 'none',
                        '&:hover': profile.roles.length > 1
                          ? {
                              bgcolor: alpha(meta.accent, 0.12),
                              transform: 'translateX(3px)',
                            }
                          : undefined,
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                        <Box>
                          <Typography
                            sx={{
                              fontFamily: '"Syne", sans-serif',
                              fontWeight: 700,
                              color: NAVY,
                              fontSize: '1.05rem',
                            }}
                          >
                            {role}
                          </Typography>
                          <Typography sx={{ fontSize: 13, color: MUTED, mt: 0.25, lineHeight: 1.4 }}>
                            {meta.blurb}
                          </Typography>
                        </Box>
                        {active && (
                          <Typography
                            sx={{
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: '0.14em',
                              textTransform: 'uppercase',
                              color: meta.accent,
                              flexShrink: 0,
                            }}
                          >
                            Active
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>

              {profile.roles.length > 1 && (
                <Typography sx={{ mt: 1.75, fontSize: 12, color: MUTED }}>
                  Switching reloads your workspace to the default home for that role.
                </Typography>
              )}
            </Box>
          </Stack>
        </Box>

        {/* Footer action */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={1.5}
          sx={{
            mt: 3.5,
            pt: 2.5,
            borderTop: `1px solid ${alpha(NAVY, 0.1)}`,
            animation: mounted ? `${fadeUp} 0.7s 0.35s ease both` : 'none',
          }}
        >
          <Typography sx={{ fontSize: 13, color: MUTED, maxWidth: 420 }}>
            Precision identity for physical inventory — built for counters, checkers, and reconcilers.
          </Typography>
          <Button
            onClick={() => navigate(getDefaultRouteForRole(profile.active))}
            sx={{
              alignSelf: { xs: 'stretch', sm: 'center' },
              px: 2.5,
              py: 1.1,
              borderRadius: 0,
              textTransform: 'none',
              fontFamily: '"Syne", sans-serif',
              fontWeight: 700,
              letterSpacing: '0.02em',
              color: '#fff',
              bgcolor: NAVY,
              '&:hover': { bgcolor: STEEL },
            }}
          >
            Return to workspace
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
