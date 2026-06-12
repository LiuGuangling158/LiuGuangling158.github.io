---
title: 面向对象设计原则入门：SRP、OCP 与 DIP
pubDate: 2026-06-12
---

---

title: 面向对象设计原则入门：SRP、OCP 与 DIP
description: 理解面向对象设计原则，掌握单一职责原则、开闭原则和依赖倒置原则的核心思想与实际应用
pubDate: 2026-06-12
category: 编程学习记录
draft: false
------------

# 面向对象设计原则入门：SRP、OCP 与 DIP

在学习面向对象编程（OOP）时，很多同学会发现：即使代码能够运行，也未必是优秀的代码。

随着项目规模增大，如果类之间耦合严重、职责混乱，后续维护和扩展都会变得十分困难。

为了解决这些问题，软件工程领域提出了一系列设计原则，其中最经典的就是 SOLID 原则。

本文主要介绍其中三个最常用的原则：

* SRP（Single Responsibility Principle，单一职责原则）
* OCP（Open-Closed Principle，开闭原则）
* DIP（Dependency Inversion Principle，依赖倒置原则）

---

# 一、为什么需要设计原则

假设我们开发一个学生管理系统。

初学者可能会写出这样的代码：

```java
public class StudentManager {

    public void addStudent() {}

    public void deleteStudent() {}

    public void printStudent() {}

    public void saveToDatabase() {}

    public void sendEmail() {}

}
```

随着功能增加：

* 数据库操作
* 邮件通知
* 日志记录
* 权限控制

全部堆积在同一个类中。

最终会出现：

* 类越来越大
* 代码难以维护
* 修改一个功能影响多个模块

设计原则的目的就是让系统：

* 更容易维护
* 更容易扩展
* 更容易测试
* 更容易团队协作

---

# 二、SRP：单一职责原则

## 核心思想

> 一个类只负责一种功能，一个类应该只有一个引起变化的原因。

简单来说：

```text
一个类只做一件事
```

---

## 错误示例

```java
public class Student {

    public void saveToDatabase() {}

    public void sendEmail() {}

    public void calculateScore() {}

}
```

这个类同时负责：

* 学生成绩计算
* 数据库存储
* 邮件发送

职责过多。

---

## 优化方案

```java
public class Student {
}

public class StudentService {
    public void calculateScore() {}
}

public class StudentRepository {
    public void save() {}
}

public class EmailService {
    public void sendEmail() {}
}
```

每个类负责独立功能。

---

## 优势

### 降低复杂度

每个类逻辑更简单。

### 提高可维护性

修改邮件功能不会影响成绩计算。

### 便于测试

可以单独测试每个模块。

---

## 软件工程中的应用

常见项目结构：

```text
Controller
Service
Repository
Entity
```

实际上就是 SRP 的体现。

---

# 三、OCP：开闭原则

## 核心思想

> 软件实体应当对扩展开放，对修改关闭。

意思是：

```text
允许新增功能
尽量不修改已有代码
```

---

## 错误示例

支付系统：

```java
public class PaymentService {

    public void pay(String type) {

        if(type.equals("Alipay")){
            // 支付宝支付
        }

        if(type.equals("Wechat")){
            // 微信支付
        }

    }

}
```

如果以后增加：

* 银联支付
* PayPal
* Apple Pay

就必须不断修改原代码。

---

## 优化方案

定义统一接口：

```java
public interface Payment {
    void pay();
}
```

支付宝实现：

```java
public class Alipay implements Payment {
    public void pay() {}
}
```

微信实现：

```java
public class WechatPay implements Payment {
    public void pay() {}
}
```

支付服务：

```java
public class PaymentService {

    public void pay(Payment payment){
        payment.pay();
    }

}
```

新增支付方式时：

```java
public class PaypalPay implements Payment {
    public void pay(){}
}
```

无需修改已有代码。

---

## 优势

### 提高扩展性

新增功能更加容易。

### 降低风险

避免修改旧代码引入新 Bug。

### 方便团队协作

不同开发者可以独立开发新模块。

---

## 软件工程中的应用

常见场景：

* 支付系统
* 登录方式扩展
* 消息通知系统
* 插件系统

---

# 四、DIP：依赖倒置原则

## 核心思想

> 高层模块不应该依赖低层模块，两者都应该依赖抽象。

简单理解：

```text
依赖接口
不要依赖具体实现
```

---

## 错误示例

订单系统直接依赖支付宝：

```java
public class OrderService {

    private Alipay alipay = new Alipay();

    public void pay(){
        alipay.pay();
    }

}
```

问题：

如果改用微信支付：

```java
public class WechatPay
```

必须修改 OrderService。

---

## 优化方案

定义接口：

```java
public interface Payment {
    void pay();
}
```

实现类：

```java
public class Alipay implements Payment {
    public void pay(){}
}
```

```java
public class WechatPay implements Payment {
    public void pay(){}
}
```

订单系统：

```java
public class OrderService {

    private Payment payment;

    public OrderService(Payment payment){
        this.payment = payment;
    }

    public void pay(){
        payment.pay();
    }

}
```

这样 OrderService 不关心具体支付方式。

---

## 优势

### 降低耦合

模块之间依赖关系更简单。

### 提高可扩展性

更换实现无需修改业务代码。

### 便于单元测试

测试时可使用 Mock 对象替代真实实现。

---

## 软件工程中的应用

Spring 框架中的：

```java
@Autowired
```

本质上就是依赖注入（DI）。

而依赖注入正是依赖倒置原则的重要实现方式。

---

# 五、三大原则关系总结

| 原则  | 核心思想        | 目标    |
| --- | ----------- | ----- |
| SRP | 一个类只负责一种功能  | 降低复杂度 |
| OCP | 对扩展开放，对修改关闭 | 提高扩展性 |
| DIP | 依赖抽象而非具体实现  | 降低耦合  |

可以这样记忆：

```text
SRP：
一个类做好一件事

OCP：
新增功能不要改旧代码

DIP：
面向接口编程
```

---

# 六、什么是 SRP、OCP 和 DIP？

回答：

SRP（单一职责原则）要求一个类只负责一种职责，避免功能过于复杂；OCP（开闭原则）要求系统对扩展开放、对修改关闭，通过新增代码实现新功能而不是修改旧代码；DIP（依赖倒置原则）要求高层模块依赖抽象而非具体实现，通常通过接口和依赖注入实现。这三个原则能够降低系统耦合度，提高代码的可维护性和可扩展性，是面向对象设计的重要基础。

---

# 结语

学习设计原则的目的并不是背诵概念，而是在实际项目中写出更容易维护和扩展的代码。很多主流框架（如 Spring）都深受这些原则影响。掌握 SRP、OCP 和 DIP，不仅有助于课程学习，也能帮助我们在实习和面试中更好地展示工程思维。
