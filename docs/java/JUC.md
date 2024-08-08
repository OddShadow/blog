---
title: JUC
author:
createTime: 2024/08/07 15:21:21
permalink: /article/6p1v104f/
---


## 1、JUC概述
- 什么是 JUC
  JUC 即 `java.util.concurrent` 工具包，是 jdk1.5 之后内置的一个处理线程问题的工具包
- 进程和线程
  `进程`是操作系统进行资源分配的最小单元，进程（Process）是计算机中的程序关于某数据集合上的一次运行活动，是`系统进行资源分配和调度的基本单位`，是操作系统结构的基础。
  `线程`是操作系统进行运算调度的最小单元，线程是操作系统能够进行`运算调度的最小单位`。它被包含在进程之中，是进程中的实际运作单位。
- 并发和并行
- jdk 中 `Thread.State` 定义了哪几种状态
    1. NEW
    2. RUNNABLE
    3. BLOCKED
    4. WAITING
    5. TIMED_WAITING
    6. TERMINATED
- jdk 中 `object.wait()` 和 `Thread.sleep()` 区别
  sleep 不需要占用释放锁，wait 需要在 synchronized 代码块中占有锁，都可以被 interrupted 方法中断
- jvm 中 管程概念，管程是一种同步机制，一种锁，jvm 同步的实现机制
- 用户线程和守护线程 `thread.isDaemon(true)`
- `synchronized` 关键字，修饰普通法法锁的是类的Class对象，修饰静态方法锁的是对象，修饰同步方法块锁的是括号中的对象
- 基本创建线程的方法，继承 Thread，实现 Runnable 或者 Callable，线程池
- execute(Runnable command): 该方法接受一个 `Runnable` 对象，没有返回值，无法获取任务的结果或状态。如果在任务执行期间发生异常，它会被 `Thread` 的 `uncaughtExceptionHandler` 捕获（如果没有设置，则该异常被忽略）。submit(Runnable task): 这个方法不仅接受 `Runnable`，还接受返回值类型的 `Callable` 对象，返回一个 `Future`对象。通过这个 `Future` 对象，你可以检查任务是否执行完毕，等待任务完成，以及获取任务执行后的结果。如果任务执行过程中抛出异常，这个异常可以通过 `Future.get()` 方法调用时被捕获和处理。
## 2、Lock 接口
多线程编程步骤
1. 创建资源类，在资源类中创建属性和操作方法
2. 创建多个线程，调用资源类的操作方法
### 2.1 两线程卖票「synchronized 和 lock 用法」
A B 两线程随机获取锁，执行卖票方法，将余票减一
#### 2.1.1 卖票方法用 `synchronized` 锁住
```java
public class SynchronizedTicket {
    public long number = 20000L;
    public synchronized void sale() {
        if (number > 0) {
            System.out.println(Thread.currentThread().getName() + "-[sale:" + number-- + "]-remain-[" + number + "]");
        }
    }
}
```
```java
public class SynchronizedDemo {
    public static void main(String[] args) {
        SynchronizedTicket synchronizedTicket = new SynchronizedTicket();
        new Thread(() -> {
            while (synchronizedTicket.number != 0) {
                synchronizedTicket.sale();
            }
        }, "A").start();
        new Thread(() -> {
            while (synchronizedTicket.number != 0) {
                synchronizedTicket.sale();
            }
        }, "B").start();
    }
}
```
#### 2.1.2 卖票方法用 `ReentrantLock` 锁住
```java
public class ReentrantLockTicket {
    public long number = 20000L;
    private final ReentrantLock lock = new ReentrantLock();
    public void sale() {
        lock.lock();
        try {
            if (number > 0) {
                System.out.println(Thread.currentThread().getName() + "-[sale:" + number-- + "]-remain-[" + number + "]");
            }
        } finally {
            lock.unlock();
        }
    }
}
```
```java
public class ReentrantLockDemo {
    public static void main(String[] args) {
        ReentrantLockTicket reentrantLockTicket = new ReentrantLockTicket();
        new Thread(() -> {
            while (reentrantLockTicket.number != 0) {
                reentrantLockTicket.sale();
            }
        }, "A").start();
        new Thread(() -> {
            while (reentrantLockTicket.number != 0) {
                reentrantLockTicket.sale();
            }
        }, "B").start();
    }
}
```
### 2.2 两线程交替打印01「线程间通信」
实现功能 A-打印1 B-打印0 交替执行各10次，互相唤醒
注意 notify() 是从所有的等待池中随机唤醒一个，notifyAll() 是唤醒所有让他们自己竞争
signal() 和 signalAll() 同理
#### 2.2.1 `wait()` 和 `notifyAll()` 交替使用
```java
class SynchronizedShare {
    private int number = 0;
    public synchronized void incr() throws InterruptedException {
        // 防止虚假唤醒
        while (number != 0) {
            this.wait();
        }
        number++;
        System.out.println(Thread.currentThread().getName() + "::" + number);
        this.notifyAll();
    }
    public synchronized void decr() throws InterruptedException {
        // 防止虚假唤醒
        while (number != 1) {
            this.wait();
        }
        number--;
        System.out.println(Thread.currentThread().getName() + "::" + number);
        this.notifyAll();
    }
}
```
```java
public class SynchronizedDemo {
    public static void main(String[] args) {
        SynchronizedShare synchronizedShare = new SynchronizedShare();
        new Thread(() -> {
            for (int i = 0; i < 10; i++) {
                try {
                    synchronizedShare.incr();
                } catch (InterruptedException e) {
                    throw new RuntimeException(e);
                }
            }
        }, "A").start();
        new Thread(() -> {
            for (int i = 0; i < 10; i++) {
                try {
                    synchronizedShare.decr();
                } catch (InterruptedException e) {
                    throw new RuntimeException(e);
                }
            }
        }, "B").start();
    }
}
```
#### 2.2.2 `ReentrantLock` 配合 `Condition` 实现
```java
public class ReentrantLockShare {
    private int number = 0;
    private final Lock lock = new ReentrantLock();
    private final Condition condition = lock.newCondition();
    public void incr() throws InterruptedException {
        lock.lock();
        try {
            // 防止虚假唤醒
            while (number != 0) {
                condition.await();
            }
            number++;
            System.out.println(Thread.currentThread().getName() + "::" + number);
            condition.signalAll();
        } finally {
            lock.unlock();
        }
    }
    public void decr() throws InterruptedException {
        lock.lock();
        try {
            // 防止虚假唤醒
            while (number != 1) {
                condition.await();
            }
            number--;
            System.out.println(Thread.currentThread().getName() + "::" + number);
            condition.signalAll();
        } finally {
            lock.unlock();
        }
    }
}
```
```java
public class ReentrantLockDemo {
    public static void main(String[] args) {
        ReentrantLockShare reentrantLockShare = new ReentrantLockShare();
        new Thread(() -> {
            for (int i = 0; i < 10; i++) {
                try {
                    reentrantLockShare.incr();
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        }, "A").start();
        new Thread(() -> {
            for (int i = 0; i < 10; i++) {
                try {
                    reentrantLockShare.decr();
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        }, "B").start();
    }
}
```
这里有个需要注意的点
```java
// 防止虚假唤醒
while (number != 0) {
    condition.await();
}
```
用 `while` 的原因是虚假唤醒，如果线程可能在 `if` 中中断，唤醒后不再判断条件，直接运行
### 2.3 三线程依次打印一个1两个2三个3「线程间定制化通信」
```java
public class ShareResource {
    private int flag = 1;
    private final Lock lock = new ReentrantLock();
    private final Condition condition1 = lock.newCondition();
    private final Condition condition2 = lock.newCondition();
    private final Condition condition3 = lock.newCondition();
    
    public void doSomethingA(int loop) throws InterruptedException {
        lock.lock();
        try {
            while (flag != 1) {
                condition1.await();
            }
            for (int i = 0; i < 1; i++) {
                System.out.println(loop + "::" + Thread.currentThread().getName() + "::1");
            }
            flag = 2;
            condition2.signal();
        } finally {
            lock.unlock();
        }
    }
    
    public void doSomethingB(int loop) throws InterruptedException {
        lock.lock();
        try {
            while (flag != 2) {
                condition2.await();
            }
            for (int i = 0; i < 2; i++) {
                System.out.println(loop + "::" + Thread.currentThread().getName() + "::2");
            }
            flag = 3;
            condition3.signal();
        } finally {
            lock.unlock();
        }
    }
    
    public void doSomethingC(int loop) throws InterruptedException {
        lock.lock();
        try {
            while (flag != 3) {
                condition3.await();
            }
            for (int i = 0; i < 3; i++) {
                System.out.println(loop + "::" + Thread.currentThread().getName() + "::3");
            }
            flag = 1;
            condition1.signal();
        } finally {
            lock.unlock();
        }
    }
}
```
```java
public class ReentrantLockDemo {
    public static void main(String[] args) {
        ShareResource shareResource = new ShareResource();
        new Thread(() -> {
            try {
                for (int i = 0; i < 10; i++) {
                    shareResource.doSomethingA(i);
                }
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }, "AAA").start();
        new Thread(() -> {
            try {
                for (int i = 0; i < 10; i++) {
                    shareResource.doSomethingB(i);
                }
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }, "BBB").start();
        new Thread(() -> {
            try {
                for (int i = 0; i < 10; i++) {
                    shareResource.doSomethingC(i);
                }
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }, "CCC").start();
    }
}
```
## 3、集合的线程安全
对于 list，set，hashmap 来说
多线程操作集合会并发异常 ConcurrentModificationException
```java
for (int i = 0; i < 100; i++) {
    new Thread(() -> {
        list.add(0);
        System.out.println(list.hashCode());
    }, "A-Thread").start();
}
```
解决并发修改异常
1. `Vector<Object> vector = new Vector<>();`
2. `Collection<Object> list = Collections.synchronizedCollection(new ArrayList<>());`
3. `CopyOnWriteArrayList<Object> copyOnWriteArrayList = new CopyOnWriteArrayList<>();`
   同样有 `copyOnWriteArraySet` 和 `ConcurrentHashMap` 解决线程安全问题
   *写时复制技术*
   COW 将复制操作推迟到第一次写入时 进行：在创建一个新副本时，不会立即复制资源，而是共享原始副本的资源；当修改时再执行复制操作。通过这种方式共享资源，可以显著减少创建副本时的开销，以及节省资源；同时，资源修改操作会增加少量开销。
   对于 list 来说，就是共享读，副本写后合并
   *java 异常体系*
1. 错误（Errors）
   错误如 `OutOfMemoryError` 和 `StackOverflowError`，通常反映了 JVM 无法恢复的严重问题。这种分类有助于开发者根据异常类型选择合适的错误处理策略。
2. 异常（Exception）
    - 非受检异常（Unchecked Exceptions） / 运行时异常（Runtime Exceptions）
      运行时异常如 `NullPointerException` 和 `IndexOutOfBoundsException`，通常由程序逻辑错误引起，不强制要求显式处理。
    - 受检异常（Checked Exceptions）/ 编译时异常
      受检异常必须在代码中显式地进行处理（捕获或声明抛出），常见的如 `IOException` 和 `SQLException`。
## 4、 JUC 辅助类
### 4.1 CountDownLatch
6 位同学离开教室后，锁门
锁存器递减到 0 才可以执行，A 线程等待其它线程将锁存器减到 0
```java
public class CountDownLatchTest {
    public static void main(String[] args) throws InterruptedException {
        // 创建CountDown对象并设置初始值
        CountDownLatch countDownLatch = new CountDownLatch(6);
        // 创建六个线程，模拟六个学生
        for (int i = 1; i <= 6; i++) {
            new Thread(()->{
                System.out.println(Thread.currentThread().getName() + "离开教室");
                // 计数 -1
                countDownLatch.countDown();
            },String.valueOf(i)).start();
        }
        // 等待，直到达到零
        countDownLatch.await();
        System.out.println(Thread.currentThread().getName() + "锁门");
    }
}
```
### 4.2 CyclicBarrier
集齐七颗龙珠后召唤神龙
```java
public class CyclicBarrirtTest {
    // 创建固定值
    private static final int NUMBER  = 7;
    public static void main(String[] args) {
        // 每次执行 CyclicBarrier 一次障碍数会加一，如果达到了目标障碍数，才会执行 cyclicBarrier.await()之后的语句。
        CyclicBarrier cyclicBarrier = new CyclicBarrier(NUMBER, () -> {
            System.out.println("集齐7颗龙珠就可以召唤神龙");
        });
        for (int i = 1; i <= 7; i++) {
            new Thread(()->{
                System.out.println(Thread.currentThread().getName() + " 星龙被收集到了");
                try {
                    // 计数 +1
                    cyclicBarrier.await();
                } catch (InterruptedException e) {
                    e.printStackTrace();
                } catch (BrokenBarrierException e) {
                    e.printStackTrace();
                }

            },String.valueOf(i)).start();
        }
    }
}
```
### 4.3 Smaphore
信号灯机制，最多 3 个执行
```java
public class SemaphoreTest {
    public static void main(String[] args) {
        //创建Semaphore，设置许可数量
        Semaphore semaphore = new Semaphore(3);
        for (int i = 1; i <= 6; i++) {
            new Thread(()->{
                try {
                    // 抢占
                    semaphore.acquire();
                    System.out.println(Thread.currentThread().getName() + "抢到了车位");
                    // 设置停车时间
                    TimeUnit.SECONDS.sleep(new Random().nextInt(5));
                    // 离开车位
                    System.out.println(Thread.currentThread().getName() + "------离开了车位");
                } catch (InterruptedException e) {
                    e.printStackTrace();
                } finally {
                    // 释放
                    semaphore.release();
                }
            },String.valueOf(i)).start();
        }
    }
}
```
## 5、读写锁
读读共享，读写互斥
长时间获取写锁可能导致读锁饥饿，可以通过写锁降低成读锁，加大并发
```java
class MyCache{
    private volatile Map<String, Object> map = new HashMap<>();
    // 创建读写锁
    private ReadWriteLock rwlock = new ReentrantReadWriteLock();
    // 放数据
    public void put(String key, Object value) {
        // 添加写锁
        rwlock.writeLock().lock();
        try {
            System.out.println(Thread.currentThread().getName() + "正在写操作" + key);
            // 暂停一会
            TimeUnit.MICROSECONDS.sleep(300);
            // 放数据
            map.put(key, value);
            System.out.println(Thread.currentThread().getName() + "写完了" + key);
        } catch (InterruptedException e) {
            e.printStackTrace();
        } finally {
            // 释放写锁
            rwlock.writeLock().unlock();
        }
    }
    // 取数据
    public void get(String key) {
        // 添加读锁
        rwlock.readLock().lock();;
        try {
            System.out.println(Thread.currentThread().getName() + "正在取操作" + key);
            // 暂停一会
            TimeUnit.MICROSECONDS.sleep(300);
            // 放数据
            map.get(key);
            System.out.println(Thread.currentThread().getName() + "取完了" + key);
        } catch (InterruptedException e) {
            e.printStackTrace();
        } finally {
            // 释放读锁
            rwlock.readLock().unlock();
        }
    }
}

public class ReadWriteLockTest {
    public static void main(String[] args) {
        MyCache myCache = new MyCache();
        for (int i = 1; i <= 6; i++) {
            final int num = i;
            new Thread(()->{
                    myCache.put(String.valueOf(num),String.valueOf(num));
            },String.valueOf(i)).start();
        }
        for (int i = 1; i <= 6; i++) {
            final int num = i;
            new Thread(()->{
                myCache.get(String.valueOf(num));
            },String.valueOf(i)).start();
        }
    }
}
```
## 6、阻塞队列
```java
Queue<Object> queue1 = new ArrayBlockingQueue<>(10);  
Queue<Object> queue2 = new LinkedBlockingQueue<>(10);  
Queue<Object> queue3 = new DelayQueue<>();  
Queue<Object> queue4 = new PriorityBlockingQueue<>();  
Queue<Object> queue5 = new SynchronousQueue<>();  
Queue<Object> queue6 = new LinkedTransferQueue<>();  
Queue<Object> queue7 = new LinkedBlockingDeque<>();
```
## 7、线程池
创建方式
```java
// 一个池，五个线程
ExecutorService threadPool1 = Executors.newFixedThreadPool(5);
// 一个池，一个线程
ExecutorService threadPool2 = Executors.newSingleThreadExecutor();
// 一个池，可扩容
ExecutorService threadPool3 = Executors.newCachedThreadPool();
```
```java
public class ThreadPoolTest {
    public static void main(String[] args) {
        ExecutorService threadPool1 = Executors.newFixedThreadPool(5);
        ExecutorService threadPool2 = Executors.newSingleThreadExecutor();
        ExecutorService threadPool3 = Executors.newCachedThreadPool();
        try{
            for (int i = 1; i <= 10; i++) {
                // 到此时执行execute()方法才创建线程
                threadPool2.execute(()->{
                    System.out.println(Thread.currentThread().getName() + "办理业务");
                });
            }
        } finally {
            // 关闭线程
            threadPool1.shutdown();
        }
    }
}
```
FixedThreadPool 和 SingleThreadExecutor 容易 OOM，一般自己创建线程池
```java
public class ThreadPoolTest {
    public static void main(String[] args) {
        // 组定义线程池
        ExecutorService threadPool = new ThreadPoolExecutor(
                2,5,2L,TimeUnit.SECONDS,new ArrayBlockingQueue<>(3),
                Executors.defaultThreadFactory(),new ThreadPoolExecutor.AbortPolicy());
        try {
            for (int i = 1; i <= 8; i++) {
                threadPool.execute(()->{
                    System.out.println(Thread.currentThread().getName() + "办理业务");
                });
            }
        } catch (Exception e){
            e.printStackTrace();
        } finally {
            threadPool.shutdown();
        }
    }
}
```
构造方法的七个参数
```java
ThreadPoolExecutor(
    int corePoolSize,
    int maximumPoolSize,
    long keepAliveTime,
    TimeUnit unit,
    BlockingQueue<Runnable> workQueue,
    ThreadFactory threadFactory,
    RejectedExecutionHandler handler) {
}
```
1. corePoolSize 常驻(核心)线程数
2. maximumPoolSize 最大线程数
3. keepAliveTime 非核心线程存活时间
4. unit 线程存活时间单位
5. workQueue 阻塞队列
6. threadFactory 线程工厂
7. handler 拒绝策略
   注意点
- 阻塞队列满后，开始创建非核心线程，非核心线程数=最大线程数-核心线程数
- 阻塞队列满了，线程数也达到最大线程数了，线程池饱和，执行拒绝策略
  *阻塞队列*
  https://tech.meituan.com/2020/04/02/java-pooling-pratice-in-meituan.html
  *拒绝策略*
1. 默认直接抛异常
2. CallRunsPolicy 退回调用者
3. 抛弃无法处理任务
4. 抛弃最久等待
   具体如下，自行对照
- `ThreadPoolExecutor.AbortPolicy`：抛出 `RejectedExecutionException`来拒绝新任务的处理。
- `ThreadPoolExecutor.CallerRunsPolicy`：调用执行自己的线程运行任务，也就是直接在调用`execute`方法的线程中运行(`run`)被拒绝的任务，如果执行程序已关闭，则会丢弃该任务。因此这种策略会降低对于新任务提交速度，影响程序的整体性能。如果您的应用程序可以承受此延迟并且你要求任何一个任务请求都要被执行的话，你可以选择这个策略。
- `ThreadPoolExecutor.DiscardPolicy`：不处理新任务，直接丢弃掉。
- `ThreadPoolExecutor.DiscardOldestPolicy`：此策略将丢弃最早的未处理的任务请求。
