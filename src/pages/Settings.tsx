import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  User, 
  Mail, 
  Type, 
  Palette, 
  UserPlus, 
  HelpCircle, 
  LogOut, 
  Trash2,
  ArrowLeft,
  Save,
  AlertTriangle
} from 'lucide-react';

const Settings = () => {
  const { user, profile, signOut, refreshUserData } = useAuth();
  const navigate = useNavigate();
  
  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [fontSize, setFontSize] = useState('medium');
  const [fontStyle, setFontStyle] = useState('inter');
  const [theme, setTheme] = useState('dark');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form with actual user data
  React.useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
    if (user?.email) {
      setEmail(user.email);
    }
  }, [profile, user]);

  // Font style options
  const fontOptions = [
    { value: 'inter', label: 'Inter (Default)', family: 'Inter, sans-serif' },
    { value: 'roboto', label: 'Roboto', family: 'Roboto, sans-serif' },
    { value: 'open-sans', label: 'Open Sans', family: 'Open Sans, sans-serif' },
    { value: 'lato', label: 'Lato', family: 'Lato, sans-serif' },
    { value: 'poppins', label: 'Poppins', family: 'Poppins, sans-serif' },
    { value: 'nunito', label: 'Nunito', family: 'Nunito, sans-serif' },
    { value: 'source-sans', label: 'Source Sans Pro', family: 'Source Sans Pro, sans-serif' },
    { value: 'montserrat', label: 'Montserrat', family: 'Montserrat, sans-serif' },
    { value: 'ubuntu', label: 'Ubuntu', family: 'Ubuntu, sans-serif' },
    { value: 'raleway', label: 'Raleway', family: 'Raleway, sans-serif' }
  ];

  const handleSavePreferences = async () => {
    try {
      // Save preferences to localStorage (effects handle real-time application)
      localStorage.setItem('pulseai-font-style', fontStyle);
      localStorage.setItem('pulseai-font-size', fontSize);
      localStorage.setItem('pulseai-theme', theme);
      
      toast.success('Appearance preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    }
  };

  // Load saved preferences on component mount
  React.useEffect(() => {
    const savedFontStyle = localStorage.getItem('pulseai-font-style');
    const savedFontSize = localStorage.getItem('pulseai-font-size');
    const savedTheme = localStorage.getItem('pulseai-theme');
    
    // Apply font style
    if (savedFontStyle) {
      setFontStyle(savedFontStyle);
      const selectedFont = fontOptions.find(font => font.value === savedFontStyle);
      if (selectedFont) {
        document.body.style.fontFamily = selectedFont.family;
      }
    }
    
    // Apply font size
    if (savedFontSize) {
      setFontSize(savedFontSize);
      document.body.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large');
      document.body.classList.add(`font-${savedFontSize}`);
    }
    
    // Apply theme
    if (savedTheme) {
      setTheme(savedTheme);
      const html = document.documentElement;
      html.classList.remove('theme-light', 'theme-dark');
      
      if (savedTheme === 'light') {
        html.classList.add('theme-light');
      } else if (savedTheme === 'dark') {
        html.classList.add('theme-dark');
      } else if (savedTheme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        html.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
      }
    } else {
      // Default to dark theme if no preference is saved
      const html = document.documentElement;
      html.classList.add('theme-dark');
    }
  }, [fontOptions]);

  // Real-time preview effects
  React.useEffect(() => {
    // Apply font style preview
    const selectedFont = fontOptions.find(font => font.value === fontStyle);
    if (selectedFont) {
      document.body.style.fontFamily = selectedFont.family;
    }
  }, [fontStyle, fontOptions]);

  React.useEffect(() => {
    // Apply font size preview
    document.body.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large');
    document.body.classList.add(`font-${fontSize}`);
  }, [fontSize]);

  React.useEffect(() => {
    // Apply theme preview
    const html = document.documentElement;
    html.classList.remove('theme-light', 'theme-dark');
    
    if (theme === 'light') {
      html.classList.add('theme-light');
    } else if (theme === 'dark') {
      html.classList.add('theme-dark');
    } else if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
    }
  }, [theme]);

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      if (!user) {
        toast.error('User not found');
        return;
      }

      // Update user profile in database
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('user_id', user.id);

      if (error) {
        console.error('Profile update error:', error);
        toast.error('Failed to update profile');
        return;
      }

      // Refresh user data to get updated profile
      await refreshUserData();
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOutAllSessions = async () => {
    try {
      await signOut();
      toast.success('Signed out from all sessions');
      navigate('/');
    } catch (error) {
      toast.error('Failed to sign out from all sessions');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm account deletion');
      return;
    }
    
    try {
      // TODO: Implement account deletion logic
      toast.success('Account deletion request submitted');
      navigate('/');
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  const handleReferFriend = () => {
    const referralLink = `${window.location.origin}/?ref=${user?.id}`;
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Manage your account preferences and settings</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Profile Information */}
          <Card className="card-glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    placeholder="Your email address"
                    disabled
                    className="bg-muted/50 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email address cannot be changed. Contact support if you need to update it.
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleSaveProfile}
                disabled={isLoading}
                className="btn-hero"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* Appearance Settings */}
          <Card className="card-glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Appearance & Preferences
              </CardTitle>
              <CardDescription>
                Customize your interface and reading experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fontStyle">Font Style</Label>
                  <Select value={fontStyle} onValueChange={setFontStyle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select font style" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {fontOptions.map((font) => (
                        <SelectItem 
                          key={font.value} 
                          value={font.value}
                          style={{ fontFamily: font.family }}
                        >
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fontSize">Font Size</Label>
                  <Select value={fontSize} onValueChange={setFontSize}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select font size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                      <SelectItem value="extra-large">Extra Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theme">Website/Chatbox Theme</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Dark Mode</SelectItem>
                      <SelectItem value="light">Light Mode</SelectItem>
                      <SelectItem value="auto">Auto (System)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                onClick={handleSavePreferences}
                variant="outline"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>

          {/* Social & Support */}
          <Card className="card-glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Social & Support
              </CardTitle>
              <CardDescription>
                Invite friends and get help when you need it
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={handleReferFriend}
                  variant="outline"
                  className="flex-1"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Refer a Friend
                </Button>
                <Button 
                  onClick={() => window.open('mailto:support@pulseai.com', '_blank')}
                  variant="outline"
                  className="flex-1"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Security */}
          <Card className="card-glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogOut className="h-5 w-5 text-warning" />
                Account Security
              </CardTitle>
              <CardDescription>
                Manage your account security and sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleSignOutAllSessions}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out of All Sessions
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="card-glass border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions that will permanently affect your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full sm:w-auto">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      Delete Account
                    </DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="deleteConfirm">
                        Type <strong>DELETE</strong> to confirm
                      </Label>
                      <Input
                        id="deleteConfirm"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder="Type DELETE here"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmation !== 'DELETE'}
                        className="flex-1"
                      >
                        Delete Account
                      </Button>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex-1">
                          Cancel
                        </Button>
                      </DialogTrigger>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;