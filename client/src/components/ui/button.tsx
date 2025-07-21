import * as React from "react";
import { Pressable, Text, ViewStyle, TextStyle } from "react-native";

const buttonVariants = {
  default: {
    container: {
      backgroundColor: "#007AFF",
    },
    text: {
      color: "white",
    },
  },
  destructive: {
    container: {
      backgroundColor: "#FF3B30",
    },
    text: {
      color: "white",
    },
  },
  outline: {
    container: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: "#007AFF",
    },
    text: {
      color: "#007AFF",
    },
  },
  secondary: {
    container: {
      backgroundColor: "#F2F2F7",
    },
    text: {
      color: "#000000",
    },
  },
  ghost: {
    container: {
      backgroundColor: "transparent",
    },
    text: {
      color: "#007AFF",
    },
  },
  link: {
    container: {
      backgroundColor: "transparent",
    },
    text: {
      color: "#007AFF",
      textDecorationLine: "underline" as const,
    },
  },
};

const buttonSizes = {
  default: {
    container: {
      height: 44,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    text: {
      fontSize: 16,
      fontWeight: "600" as const,
    },
  },
  sm: {
    container: {
      height: 36,
      paddingHorizontal: 12,
      borderRadius: 6,
    },
    text: {
      fontSize: 14,
      fontWeight: "600" as const,
    },
  },
  lg: {
    container: {
      height: 52,
      paddingHorizontal: 20,
      borderRadius: 10,
    },
    text: {
      fontSize: 18,
      fontWeight: "600" as const,
    },
  },
  icon: {
    container: {
      height: 44,
      width: 44,
      borderRadius: 8,
    },
    text: {
      fontSize: 16,
      fontWeight: "600" as const,
    },
  },
};

export interface ButtonProps extends React.ComponentPropsWithoutRef<typeof Pressable> {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  ({ variant = "default", size = "default", children, style, textStyle, ...props }, ref) => {
    const variantStyles = buttonVariants[variant];
    const sizeStyles = buttonSizes[size];

    return (
      <Pressable
        ref={ref}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          },
          variantStyles.container,
          sizeStyles.container,
          style,
        ]}
        {...props}
      >
        <Text
          style={[
            variantStyles.text,
            sizeStyles.text,
            textStyle,
          ]}
        >
          {children}
        </Text>
      </Pressable>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants, buttonSizes };
