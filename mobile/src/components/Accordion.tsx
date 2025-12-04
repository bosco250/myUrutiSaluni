import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTheme} from '../context/ThemeContext';

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  status?: 'success' | 'warning' | 'error' | 'pending';
}

export default function Accordion({
  title,
  children,
  defaultOpen = false,
  status,
}: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const {theme} = useTheme();
  const [rotateAnim] = useState(new Animated.Value(isOpen ? 1 : 0));

  const statusConfig = {
    success: {color: theme.colors.success, icon: 'check-circle'},
    warning: {color: theme.colors.warning, icon: 'schedule'},
    error: {color: theme.colors.danger, icon: 'error'},
    pending: {color: theme.colors.textMuted, icon: 'file-upload'},
  };

  const config = status ? statusConfig[status] : {color: theme.colors.textMuted, icon: 'file-upload'};

  const toggle = () => {
    const toValue = isOpen ? 0 : 1;
    Animated.timing(rotateAnim, {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setIsOpen(!isOpen);
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: status === 'error' ? theme.colors.danger : theme.colors.border,
        },
      ]}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggle}
        activeOpacity={0.7}>
        <View style={styles.headerContent}>
          <View
            style={[
              styles.iconContainer,
              {backgroundColor: `${config.color}20`},
            ]}>
            <Icon name={config.icon} size={20} color={config.color} />
          </View>
          <Text style={[styles.title, {color: theme.colors.text}]}>
            {title}
          </Text>
        </View>
        <Animated.View style={{transform: [{rotate}]}}>
          <Icon
            name="expand-more"
            size={24}
            color={theme.colors.text}
          />
        </Animated.View>
      </TouchableOpacity>
      {isOpen && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

