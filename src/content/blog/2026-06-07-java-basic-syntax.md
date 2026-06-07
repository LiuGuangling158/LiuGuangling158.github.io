---
title: Java 基础语法 —— 学习记录
description: 从零快速掌握 Java 基础语法，包括标准输入输出、变量与数据类型、运算符、控制流等核心知识点
pubDate: 2026-06-07
category: 编程学习记录
cover: /images/covers/2026-06-07-3xxbwc.png
---
Java 是一门面向对象的编程语言，它最大的特点是「一次编写，到处运行」：Java 代码编译成字节码后，可以在任何安装了 Java 虚拟机（JVM）的平台上运行，不用关心底层是 Windows、Mac 还是 Linux。

Java 的语法和 C/C++ 比较像，但去掉了指针、手动内存管理这些容易出错的特性，新手上手会比 C++ 舒服很多。同时 Java 的标准库非常丰富，常用的数据结构都给你准备好了，拿来就能用。

## Hello World 与程序结构

先看一个最简单的 Java 程序：

```java
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World!");
    }
}
```

虽然只有一行有效逻辑，但 Java 要求你必须把代码写在一个类（class）里面，而且程序的入口是 `main` 方法。这是 Java 的规矩，记住就行。

拆解一下这个结构：

- `public class Main` — 定义一个公开的类，类名叫 `Main`
- `public static void main(String[] args)` — 程序的入口方法，Java 运行时会自动找到并执行它

现阶段你不用纠结 `public`、`static`、`void` 这些关键字是什么意思，后面讲面向对象的时候会详细解释。现在只需要知道：所有代码都写在 `main` 方法的花括号 `{}` 里就行。

## 关于 Java 中「类」的规矩

和 Python、JavaScript 这些语言不同，Java 中「类」不只是一个面向对象的概念，而是代码组织的基本单位。Java 不允许你在类外面写任何代码，所有的变量、方法都必须放在某个类里面。

Java 还有几条硬性规则，初学者容易踩坑：

- **一个文件只能有一个 `public` 类**，而且文件名必须和这个类名一致。比如 `public class Main` 必须写在 `Main.java` 文件里。在本站的在线编辑器中不需要关心文件名，但在本地开发时必须遵守。
- **`main` 方法是程序的唯一入口**，签名必须是 `public static void main(String[] args)`，一个字都不能改。Java 程序启动时会去找这个方法来执行，找不到就报错。
- **一个文件里可以有多个类**，但只有一个能是 `public` 的。其他类不加 `public` 修饰符就行：

```java
// Main.java
public class Main {
    public static void main(String[] args) {
        Helper h = new Helper();
        h.sayHi();
    }
}

// 同一个文件中的非 public 类
class Helper {
    void sayHi() {
        System.out.println("Hi!");
    }
}
```

这些规则看起来比较啰嗦，这也是 Java 一直被人吐槽的地方。但好处是代码结构非常统一，看到任何 Java 项目都能很快找到入口在哪。

## 标准输出

`System.out.println` 用于在控制台打印一行内容。`System.out.print` 功能类似，但不会自动换行。

```java
public class Main {
    public static void main(String[] args) {
        // println：打印后自动换行
        System.out.println("Hello");
        System.out.println("World");

        // print：打印后不换行
        System.out.print("Hello ");
        System.out.print("World\n");

        // printf：格式化输出（和 C 语言风格一致）
        int age = 25;
        double score = 98.56;
        String name = "小明";
        System.out.printf("%s 今年 %d 岁，成绩是 %.2f 分\n", name, age, score);
    }
}
```

其中 `printf` 是格式化输出：

| 格式符 | 说明 |
|--------|------|
| `%d` | 整数 |
| `%f` | 浮点数 |
| `%.2f` | 保留两位小数 |
| `%s` | 字符串 |
| `\n` | 换行 |

如果你学过 C 语言，会发现用法一模一样。

## 读取输入

有输出就有输入。Java 用 `Scanner` 类来读取用户的输入。`Scanner` 不是 Java 内置可以直接使用的类，需要用 `import` 语句引入，后面会专门讲 `import` 机制，现在只需要知道用 `Scanner` 之前要加这行就行：

```java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        System.out.print("请输入你的名字：");
        String name = scanner.nextLine();

        System.out.print("请输入你的年龄：");
        int age = scanner.nextInt();

        System.out.printf("%s 今年 %d 岁\n", name, age);
        scanner.close();
    }
}
```

`Scanner` 的常用方法就这几个：

| 方法 | 说明 |
|------|------|
| `next()` | 读取一个字符串（遇到空格或换行就停） |
| `nextLine()` | 读取一整行 |
| `nextInt()` | 读取一个整数 |
| `nextDouble()` | 读取一个浮点数 |
| `hasNext()` | 判断是否还有输入（循环读取时常用） |

## 变量与数据类型

### 基本类型

Java 的基本数据类型有 8 种，最常用的是以下几种：

| 类型 | 说明 | 示例 |
|------|------|------|
| `int` | 整数（32 位） | `int a = 10;` |
| `long` | 长整数（64 位） | `long b = 100000000000L;` |
| `double` | 浮点数（小数） | `double c = 3.14;` |
| `boolean` | 布尔值 | `boolean d = true;` |
| `char` | 单个字符 | `char e = 'A';` |

```java
public class Main {
    public static void main(String[] args) {
        int a = 10;                   // 整数
        long b = 100000000000L;       // 长整数，注意 L 后缀
        double c = 3.14;              // 浮点数
        boolean d = true;             // 布尔值
        char e = 'A';                 // 单个字符，用单引号
        String f = "Hello World";     // 字符串，用双引号

        System.out.println("int: " + a);
        System.out.println("long: " + b);
        System.out.println("double: " + c);
        System.out.println("boolean: " + d);
        System.out.println("char: " + e);
        System.out.println("String: " + f);
    }
}
```

几个注意点：

- `long` 类型的字面量要加 `L` 后缀（如 `9999999999L`），否则编译器会把它当成 `int`，超出 `int` 范围就会报错。
- `char` 用单引号 `'A'`，`String`（字符串）用双引号 `"Hello"`，这两个不能搞混。

### 变量声明

Java 是静态类型语言，变量必须先声明类型才能使用：

```java
// 先声明，后赋值
int x;
x = 10;

// 声明的同时赋值
int y = 20;

// 一行声明多个同类型变量
int a = 1, b = 2, c = 3;
```

Java 10 以后可以用 `var` 让编译器自动推断类型：

```java
var name = "Java";   // 编译器推断为 String
var count = 100;     // 编译器推断为 int
```

`var` 只是语法糖，类型在编译时就确定了，不是动态类型。

### 类型转换

小类型可以自动转换为大类型（不丢精度），反过来需要强制转换：

```java
public class Main {
    public static void main(String[] args) {
        // 自动转换：小 → 大
        int i = 100;
        long l = i;      // int → long，安全
        double d = i;    // int → double，安全

        // 强制转换：大 → 小（可能丢精度）
        double pi = 3.14159;
        int ipi = (int) pi;  // 强制转换，小数部分丢掉 → 3

        long bigNum = 9999999999L;
        int smallNum = (int) bigNum;  // 可能溢出！

        System.out.println("double → int: " + ipi);
    }
}
```

特别注意整数除法：`1 / 2` 的结果是 `0` 而不是 `0.5`，因为两个 `int` 相除结果还是 `int`，小数部分直接丢掉。这在算法题中是个常见的坑。

```java
int result = 1 / 2;        // 结果是 0，不是 0.5！
double correct = 1.0 / 2;  // 结果是 0.5，因为 1.0 是 double
```

## 运算符

### 算术运算符

```java
int a = 10, b = 3;
System.out.println(a + b);   // 13  加法
System.out.println(a - b);   // 7   减法
System.out.println(a * b);   // 30  乘法
System.out.println(a / b);   // 3   除法（整数相除，小数被截断）
System.out.println(a % b);   // 1   取余

// 自增自减
a++;   // a = 11（自增）
b--;   // b = 2（自减）
```

取余运算符 `%` 在算法题中非常常用，比如判断奇偶（`n % 2 == 0`）、循环数组索引（`i % n`）等。

### 比较与逻辑运算符

比较运算符返回 `boolean` 值：`==`（等于）、`!=`（不等于）、`<`、`>`、`<=`、`>=`。

逻辑运算符用于组合布尔表达式：`&&`（与）、`||`（或）、`!`（非）。

```java
int a = 10, b = 20;
System.out.println(a == b);   // false
System.out.println(a != b);   // true
System.out.println(a < b);    // true
System.out.println(a > b);    // false

// 逻辑运算
System.out.println(a > 5 && b > 15);   // true  （两个都真）
System.out.println(a > 5 || b > 30);   // true  （有一个真即可）
System.out.println(!(a == b));         // true  （取反）
```

### 三元运算符

`条件 ? 值1 : 值2` 是 `if-else` 的简写形式，条件为 `true` 返回值1，否则返回值2：

```java
int a = 10, b = 20;
int max = (a > b) ? a : b;  // max = 20
```

### 位运算

位运算在处理二进制相关问题时非常高效，在算法题中可能会遇到。这里了解一下基本用法：

```java
int a = 5;   // 二进制：0101
int b = 3;   // 二进制：0011

System.out.println(a & b);   // 1  按位与   0101 & 0011 = 0001
System.out.println(a | b);   // 7  按位或   0101 | 0011 = 0111
System.out.println(a ^ b);   // 6  按位异或 0101 ^ 0011 = 0110
System.out.println(~a);      // -6 按位取反 ~0101 = 1010（补码表示）

// 移位运算
System.out.println(a << 1);  // 10  左移 1 位，相当于 ×2
System.out.println(a >> 1);  // 2   右移 1 位，相当于 ÷2
```

## 控制流

### 条件判断 if / else

```java
int score = 85;

if (score >= 90) {
    System.out.println("优秀");
} else if (score >= 80) {
    System.out.println("良好");
} else if (score >= 60) {
    System.out.println("及格");
} else {
    System.out.println("不及格");
}
```

### for 循环

`for` 循环是最常用的循环，由三部分组成：`for (初始化; 条件; 更新)`。

```java
// 基本 for 循环
for (int i = 0; i < 5; i++) {
    System.out.println("i = " + i);
}

// 遍历数组
int[] arr = {10, 20, 30, 40, 50};
for (int i = 0; i < arr.length; i++) {
    System.out.println("arr[" + i + "] = " + arr[i]);
}
```

### while 循环

`while` 循环适合循环次数不确定的场景：

```java
int count = 0;
while (count < 5) {
    System.out.println("count = " + count);
    count++;
}
```

`do-while` 和 `while` 的区别是：`do-while` 先执行一次再判断条件，所以循环体至少会执行一次。实际中 `do-while` 用得很少，了解一下就行：

```java
int x = 10;
do {
    System.out.println("至少执行一次: x = " + x);
    x++;
} while (x < 5);  // 条件为 false，但循环体已经执行了一次
```

### for-each 遍历

遍历数组或集合时，`for-each` 比普通 `for` 循环更简洁：

```java
int[] arr = {1, 2, 3, 4, 5};

// for-each
for (int num : arr) {
    System.out.println(num);
}

// 等价于普通 for 循环
for (int i = 0; i < arr.length; i++) {
    int num = arr[i];
    System.out.println(num);
}
```

`for-each` 的限制是拿不到索引 `i`，也不能在遍历时修改元素。如果需要索引，还是用普通 `for` 循环。

### break 和 continue

`break` 跳出整个循环，`continue` 跳过当前这轮、进入下一轮：

```java
// break：遇到 5 就停止
for (int i = 1; i <= 10; i++) {
    if (i == 5) break;
    System.out.print(i + " ");  // 输出：1 2 3 4
}

System.out.println();

// continue：跳过偶数
for (int i = 1; i <= 10; i++) {
    if (i % 2 == 0) continue;
    System.out.print(i + " ");  // 输出：1 3 5 7 9
}
```

### switch 语句

`switch` 适合对一个变量做多个值的判断，比一长串 `if-else` 更清晰：

```java
int day = 3;
switch (day) {
    case 1:
        System.out.println("星期一");
        break;
    case 2:
        System.out.println("星期二");
        break;
    case 3:
        System.out.println("星期三");
        break;
    default:
        System.out.println("其他");
        break;
}
```

注意每个 `case` 后面要加 `break`，否则会"穿透"到下一个 `case` 继续执行。

Java 14 引入了更简洁的 `switch` 写法，用箭头 `->` 代替 `case: break`：

```java
int day = 3;
switch (day) {
    case 1 -> System.out.println("星期一");
    case 2 -> System.out.println("星期二");
    case 3 -> System.out.println("星期三");
    default -> System.out.println("其他");
}
```