import * as React from "react";
import { Modal, View, Text, Pressable, StyleSheet, ViewStyle, TextStyle } from "react-native";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export interface DialogContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export interface DialogHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export interface DialogTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export interface DialogDescriptionProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export interface DialogFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  return (
    <Modal
      visible={open}
      transparent={true}
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          {children}
        </View>
      </View>
    </Modal>
  );
};

const DialogContent = ({ children, style }: DialogContentProps) => {
  return <View style={[styles.dialogContent, style]}>{children}</View>;
};

const DialogHeader = ({ children, style }: DialogHeaderProps) => {
  return <View style={[styles.header, style]}>{children}</View>;
};

const DialogTitle = ({ children, style }: DialogTitleProps) => {
  return <Text style={[styles.title, style]}>{children}</Text>;
};

const DialogDescription = ({ children, style }: DialogDescriptionProps) => {
  return <Text style={[styles.description, style]}>{children}</Text>;
};

const DialogFooter = ({ children, style }: DialogFooterProps) => {
  return <View style={[styles.footer, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 8,
    width: '90%',
    maxWidth: 500,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dialogContent: {
    gap: 16,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
};
